'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

declare global {
  interface Window {
    naver: any;
  }
}

interface Point {
  lat: number;
  lng: number;
  address: string;
  confidence: number;
}

function ViewerContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [showMode, setShowMode] = useState<'markers' | 'heatmap'>('markers'); // 표시 모드

  // 네이버 지도 스크립트 로드 (네이버 클라우드 플랫폼 버전)
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'mq2838plqi';
    
    // 인증 실패 핸들러 등록 (공식 문서 권장)
    // 참고: https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html
    (window as any).navermap_authFailure = function () {
      console.error('🔒 네이버 지도 API 인증 실패');
      console.error('Client ID:', clientId);
      console.error('해결 방법:');
      console.error('1. 네이버 클라우드 플랫폼 콘솔에서 Web 서비스 URL 등록');
      console.error('2. http://localhost:3000 추가');
      console.error('3. Client ID 확인');
      toast.error('지도 인증 실패', {
        description: '네이버 클라우드 플랫폼에서 Web 서비스 URL(http://localhost:3000)을 등록해주세요',
        duration: 10000,
      });
      setLoading(false);
    };
    
    // 이미 로드되어 있으면 바로 초기화
    if (window.naver && window.naver.maps) {
      console.log('네이버 지도 스크립트 이미 로드됨');
      setLoading(false);
      initMap();
      return;
    }
    
    const script = document.createElement('script');
    // 네이버 클라우드 플랫폼 공식 URL 사용 (ncpKeyId 파라미터 사용)
    // 참고: https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html
    // visualization 서브모듈 추가 (마커 + 히트맵 사용)
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=visualization`;
    script.async = true;
    script.onload = () => {
      console.log('✅ 네이버 지도 스크립트 로드 완료');
      console.log('Client ID:', clientId);
      setLoading(false);
      initMap();
    };
    script.onerror = (error) => {
      console.error('❌ 네이버 지도 스크립트 로드 실패:', error);
      console.error('Client ID:', clientId);
      console.error('Script URL:', script.src);
      toast.error('지도 로드 실패', {
        description: '네이버 클라우드 플랫폼에서 Web 서비스 URL을 등록해주세요 (http://localhost:3000)',
      });
      setLoading(false);
    };
    
    document.head.appendChild(script);
    
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      // 인증 실패 핸들러 제거
      delete (window as any).navermap_authFailure;
    };
  }, []);

  // 지도 초기화
  const initMap = () => {
    if (!mapRef.current || !window.naver) return;
    
    const centerLat = parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LAT || '36.5');
    const centerLng = parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LNG || '127.9');
    const zoom = parseInt(process.env.NEXT_PUBLIC_MAP_ZOOM || '6', 10);
    
    const mapInstance = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(centerLat, centerLng),
      zoom,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: window.naver.maps.MapTypeControlStyle.BUTTON,
        position: window.naver.maps.Position.TOP_RIGHT,
      },
      zoomControl: true,
      zoomControlOptions: {
        style: window.naver.maps.ZoomControlStyle.SMALL,
        position: window.naver.maps.Position.TOP_RIGHT,
      },
    });
    
    setMap(mapInstance);
  };

  // 실제 데이터 로드
  const loadActualData = async (targetJobId: string) => {
    if (!map || !window.naver) {
      toast.error('지도가 아직 로드되지 않았습니다.');
      return;
    }
    
    setDataLoading(true);
    
    try {
      const response = await fetch(`/api/viewer/points?jobId=${targetJobId}`);
      const result = await response.json();
      
      if (!result.success) {
        toast.error('데이터 로드 실패', { description: result.error });
        return;
      }
      
      const loadedPoints = result.data.points || [];
      setPoints(loadedPoints);
      
      // 포인트가 없으면 조기 종료
      if (loadedPoints.length === 0) {
        toast.warning('데이터가 없습니다');
        return;
      }
      
      // 기존 마커 제거
      markers.forEach(marker => marker.setMap(null));
      
      // 기존 히트맵 제거
      if (heatmap) {
        heatmap.setMap(null);
      }
      
      // 마커 생성
      const newMarkers = loadedPoints.map((p: Point) => {
        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(p.lat, p.lng),
          map: showMode === 'markers' ? map : null,
          title: p.address,
          icon: {
            content: `<div style="
              width: 12px;
              height: 12px;
              background-color: #3B82F6;
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              cursor: pointer;
            "></div>`,
            anchor: new window.naver.maps.Point(6, 6),
          },
        });
        
        // 클릭 이벤트: 정보창 표시
        window.naver.maps.Event.addListener(marker, 'click', function() {
          const infoWindow = new window.naver.maps.InfoWindow({
            content: `
              <div style="padding: 15px; min-width: 200px; max-width: 300px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #1e40af;">
                  📍 주소
                </div>
                <div style="font-size: 13px; line-height: 1.5; margin-bottom: 10px; color: #374151;">
                  ${p.address}
                </div>
                <div style="font-size: 12px; color: #6b7280; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                  <span style="color: #10b981; font-weight: 600;">✓ 신뢰도: ${p.confidence}점</span>
                </div>
              </div>
            `
          });
          
          infoWindow.open(map, marker);
        });
        
        return marker;
      });
      
      setMarkers(newMarkers);
      
      // 히트맵 생성
      if (window.naver.maps.visualization) {
        const latLngs = loadedPoints.map(
          (p: Point) => new window.naver.maps.LatLng(p.lat, p.lng)
        );
        
        const heatmapLayer = new window.naver.maps.visualization.HeatMap({
          map: showMode === 'heatmap' ? map : null,
          data: latLngs,
          radius: 25,
          opacity: 0.6,
          colorMap: window.naver.maps.visualization.SpectrumStyle.RAINBOW,
        });
        
        setHeatmap(heatmapLayer);
      }
      
      // 지도 중심 계산 (평균 좌표)
      if (loadedPoints.length > 0) {
        const avgLat = loadedPoints.reduce((sum: number, p: Point) => sum + p.lat, 0) / loadedPoints.length;
        const avgLng = loadedPoints.reduce((sum: number, p: Point) => sum + p.lng, 0) / loadedPoints.length;
        
        map.setCenter(new window.naver.maps.LatLng(avgLat, avgLng));
        map.setZoom(10);
      }
      
      toast.success('데이터 로드 완료', {
        description: `${loadedPoints.length}개 포인트`,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('데이터 로드 실패');
    } finally {
      setDataLoading(false);
    }
  };

  // 샘플 데이터 로드 (테스트용)
  const loadSampleData = () => {
    if (!map || !window.naver) {
      toast.error('지도가 아직 로드되지 않았습니다.');
      return;
    }
    
    const samplePoints: Point[] = Array.from({ length: 100 }, () => ({
      lat: 37.5 + (Math.random() - 0.5) * 0.5,
      lng: 127.0 + (Math.random() - 0.5) * 0.5,
      address: '서울시 샘플주소',
      confidence: 90,
    }));
    
    setPoints(samplePoints);
    
    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    
    // 기존 히트맵 제거
    if (heatmap) {
      heatmap.setMap(null);
    }
    
    // 마커 생성
    const newMarkers = samplePoints.map((p) => {
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(p.lat, p.lng),
        map: showMode === 'markers' ? map : null,
        title: p.address,
        icon: {
          content: `<div style="
            width: 12px;
            height: 12px;
            background-color: #3B82F6;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: pointer;
          "></div>`,
          anchor: new window.naver.maps.Point(6, 6),
        },
      });
      
      // 클릭 이벤트: 정보창 표시
      window.naver.maps.Event.addListener(marker, 'click', function() {
        const infoWindow = new window.naver.maps.InfoWindow({
          content: `
            <div style="padding: 15px; min-width: 200px; max-width: 300px;">
              <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #1e40af;">
                📍 주소
              </div>
              <div style="font-size: 13px; line-height: 1.5; margin-bottom: 10px; color: #374151;">
                ${p.address}
              </div>
              <div style="font-size: 12px; color: #6b7280; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <span style="color: #10b981; font-weight: 600;">✓ 신뢰도: ${p.confidence}점</span>
              </div>
            </div>
          `
        });
        
        infoWindow.open(map, marker);
      });
      
      return marker;
    });
    
    setMarkers(newMarkers);
    
    // 히트맵 생성
    if (window.naver.maps.visualization) {
      const latLngs = samplePoints.map(
        (p) => new window.naver.maps.LatLng(p.lat, p.lng)
      );
      
      const heatmapLayer = new window.naver.maps.visualization.HeatMap({
        map: showMode === 'heatmap' ? map : null,
        data: latLngs,
        radius: 25,
        opacity: 0.6,
        colorMap: window.naver.maps.visualization.SpectrumStyle.RAINBOW,
      });
      
      setHeatmap(heatmapLayer);
    }
    
    map.setCenter(new window.naver.maps.LatLng(37.5, 127.0));
    map.setZoom(11);
    
    toast.success('샘플 데이터 로드 완료', {
      description: `${samplePoints.length}개 포인트`,
    });
  };

  // jobId가 있으면 자동으로 데이터 로드
  useEffect(() => {
    if (jobId && map) {
      loadActualData(jobId);
    }
  }, [jobId, map]);

  // 표시 모드가 변경될 때 마커/히트맵 토글
  useEffect(() => {
    if (showMode === 'markers') {
      // 마커 표시, 히트맵 숨김
      markers.forEach(marker => marker.setMap(map));
      if (heatmap) heatmap.setMap(null);
    } else {
      // 히트맵 표시, 마커 숨김
      markers.forEach(marker => marker.setMap(null));
      if (heatmap) heatmap.setMap(map);
    }
  }, [showMode, markers, heatmap, map]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">지도 뷰어</h1>
          <p className="text-sm text-gray-600">주소 데이터를 지도에서 시각화합니다</p>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 사이드바 */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">컨트롤</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={loadSampleData}
                  disabled={loading || !map || dataLoading}
                  className="w-full"
                  size="sm"
                  variant="outline"
                >
                  {loading ? '로딩 중...' : '샘플 데이터'}
                </Button>
                
                <Button
                  onClick={() => jobId && loadActualData(jobId)}
                  disabled={!jobId || !map || dataLoading}
                  className="w-full"
                  size="sm"
                >
                  {dataLoading ? '로딩 중...' : '데이터 새로고침'}
                </Button>
                
                <Button
                  variant={showMode === 'markers' ? 'default' : 'outline'}
                  className="w-full"
                  size="sm"
                  onClick={() => setShowMode('markers')}
                  disabled={markers.length === 0}
                >
                  🔵 마커 표시
                </Button>
                
                <Button
                  variant={showMode === 'heatmap' ? 'default' : 'outline'}
                  className="w-full"
                  size="sm"
                  onClick={() => setShowMode('heatmap')}
                  disabled={!heatmap}
                >
                  🔥 히트맵 표시
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={() => window.print()}
                >
                  📸 스크린샷 저장
                </Button>
              </CardContent>
            </Card>

            {/* 통계 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">통계</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 포인트:</span>
                    <span className="font-semibold">{points.length}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">표시 모드:</span>
                    <span className="font-semibold">
                      {showMode === 'markers' ? '🔵 마커' : '🔥 히트맵'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 범례 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">범례</CardTitle>
              </CardHeader>
              <CardContent>
                {showMode === 'markers' ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow"></div>
                      <span>환자 주소</span>
                    </div>
                    <div className="text-gray-500 text-[10px] mt-2">
                      💡 마커를 클릭하면 상세 정보를 확인할 수 있습니다
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <span>낮은 밀도</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                      <span>보통 밀도</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span>높은 밀도</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 지도 */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-180px)]">
              <CardContent className="p-0 h-full">
                {loading && (
                  <div className="h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-gray-600">지도 로딩 중...</p>
                    </div>
                  </div>
                )}
                <div
                  ref={mapRef}
                  className="w-full h-full rounded-lg"
                  style={{ display: loading ? 'none' : 'block' }}
                ></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ViewerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">페이지 로딩 중...</p>
        </div>
      </div>
    }>
      <ViewerContent />
    </Suspense>
  );
}

