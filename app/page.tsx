'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { detectAddressColumn } from '@/lib/addr/detect';
import { Upload, FileText, Play, Map, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface SheetInfo {
  name: string;
  index: number;
  rowCount: number;
  colCount: number;
}

interface ParseResult {
  success: boolean;
  data?: {
    headers: string[];
    rows: Record<string, any>[];
    sheetInfo: SheetInfo;
  };
  error?: string;
}

interface JobProgress {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  totalCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  currentAddress?: string;
  startTime: number;
  endTime?: number;
  estimatedTimeRemaining?: number;
  processingSpeed?: number;
  error?: string;
}

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<number>(0);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [detectedAddressColumn, setDetectedAddressColumn] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 업로드 처리
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    try {
      // 파일 업로드
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadedFileName(result.data.fileName);
        setSheets(result.data.sheets);
        setParseResult(result.data.parseResult);
        
        // 주소 컬럼 자동 감지
        if (result.data.parseResult?.data) {
          const detected = detectAddressColumn(
            result.data.parseResult.data.headers,
            result.data.parseResult.data.rows
          );
          
          if (detected && detected.confidence > 50) {
            setDetectedAddressColumn(detected.column);
            toast.success('주소 컬럼 자동 감지 완료', {
              description: `${detected.column} (신뢰도: ${detected.confidence.toFixed(1)}%)`,
            });
          } else {
            toast.warning('주소 컬럼을 자동으로 찾을 수 없습니다', {
              description: '수동으로 주소 컬럼을 선택해주세요.',
            });
          }
        }
      } else {
        toast.error('업로드 실패', {
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('업로드 중 오류가 발생했습니다');
    }
  };

  // 시트 변경
  const handleSheetChange = async (sheetIndex: number) => {
    setSelectedSheet(sheetIndex);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: uploadedFileName,
          sheetIndex,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setParseResult(result.data.parseResult);
        
        if (result.data.parseResult?.data) {
          const detected = detectAddressColumn(
            result.data.parseResult.data.headers,
            result.data.parseResult.data.rows
          );
          
          if (detected && detected.confidence > 50) {
            setDetectedAddressColumn(detected.column);
          } else {
            setDetectedAddressColumn(null);
          }
        }
      }
    } catch (error) {
      console.error('Sheet change error:', error);
      toast.error('시트 변경 중 오류가 발생했습니다');
    }
  };

  // 처리 시작
  const handleProcess = async () => {
    if (!file || !detectedAddressColumn || !uploadedFileName) {
      toast.error('주소 컬럼이 선택되지 않았습니다');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: uploadedFileName,
          sheetIndex: selectedSheet,
          addressColumn: detectedAddressColumn,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const newJobId = result.data.jobId;
        setJobId(newJobId);
        toast.success('처리가 시작되었습니다');
        
        // 진행률 모니터링 시작
        startProgressMonitoring(newJobId);
      } else {
        toast.error('처리 시작 실패', {
          description: result.error,
        });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Process error:', error);
      toast.error('처리 중 오류가 발생했습니다');
      setIsProcessing(false);
    }
  };

  // 진행률 모니터링 (Polling)
  const startProgressMonitoring = (jobId: string) => {
    let pollingInterval: NodeJS.Timeout | null = null;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/status/${jobId}`);
        const data = await response.json();
        
        setProgress(data);

        if (data.status === 'completed') {
          if (pollingInterval) clearInterval(pollingInterval);
          setIsProcessing(false);
          toast.success('처리 완료!', {
            description: '결과를 확인하세요.',
          });
        } else if (data.status === 'failed') {
          if (pollingInterval) clearInterval(pollingInterval);
          setIsProcessing(false);
          toast.error('처리 실패', {
            description: data.error,
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (pollingInterval) clearInterval(pollingInterval);
        setIsProcessing(false);
      }
    };

    // 즉시 첫 번째 호출
    pollStatus();

    // 1초마다 폴링
    pollingInterval = setInterval(pollStatus, 1000);

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  };

  // 파일 선택 초기화
  const resetFile = () => {
    setFile(null);
    setUploadedFileName(null);
    setParseResult(null);
    setSheets([]);
    setDetectedAddressColumn(null);
    setJobId(null);
    setProgress(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 진행률 계산
  const progressPercentage = progress
    ? Math.round((progress.processedCount / progress.totalCount) * 100)
    : 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">신환 주소 분석 시스템</h1>
        <p className="text-muted-foreground">엑셀 파일의 주소를 자동으로 지오코딩하고 분석합니다</p>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="grid gap-6">
        {/* 1. 파일 업로드 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              1. 파일 업로드
            </CardTitle>
            <CardDescription>엑셀 또는 CSV 파일을 선택하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="file-upload">파일 선택</Label>
                <Input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="cursor-pointer"
                />
              </div>
              {file && (
                <Button variant="outline" onClick={resetFile} disabled={isProcessing}>
                  초기화
                </Button>
              )}
            </div>

            {file && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">{file.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  크기: {(file.size / 1024).toFixed(2)} KB
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. 데이터 미리보기 & 설정 */}
        {parseResult?.data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                2. 데이터 미리보기
              </CardTitle>
              <CardDescription>
                총 {parseResult.data.rows.length}개의 행이 감지되었습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 시트 선택 */}
              {sheets.length > 1 && (
                <div>
                  <Label>시트 선택</Label>
                  <Select
                    value={selectedSheet.toString()}
                    onValueChange={(value) => handleSheetChange(parseInt(value))}
                    disabled={isProcessing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sheets.map((sheet) => (
                        <SelectItem key={sheet.index} value={sheet.index.toString()}>
                          {sheet.name} ({sheet.rowCount}행 × {sheet.colCount}열)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 주소 컬럼 선택 */}
              <div>
                <Label>주소 컬럼</Label>
                <Select
                  value={detectedAddressColumn || ''}
                  onValueChange={setDetectedAddressColumn}
                  disabled={isProcessing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="주소 컬럼을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {parseResult.data.headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                        {header === detectedAddressColumn && ' ✓ (자동감지)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 데이터 미리보기 테이블 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        {parseResult.data.headers.map((header) => (
                          <TableHead
                            key={header}
                            className={
                              header === detectedAddressColumn
                                ? 'bg-primary/10 font-bold'
                                : ''
                            }
                          >
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.data.rows.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{idx + 1}</TableCell>
                          {parseResult.data!.headers.map((header) => (
                            <TableCell
                              key={header}
                              className={
                                header === detectedAddressColumn
                                  ? 'bg-primary/5'
                                  : ''
                              }
                            >
                              {row[header]?.toString() || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="p-2 bg-muted text-sm text-center text-muted-foreground">
                  상위 5개 행 표시 중 (전체: {parseResult.data.rows.length}행)
                </div>
              </div>

              {/* 처리 시작 버튼 */}
              <Button
                onClick={handleProcess}
                disabled={!detectedAddressColumn || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    처리 시작
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 3. 처리 진행률 */}
        {progress && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} />
                3. 처리 진행률
              </CardTitle>
              <CardDescription>
                {progress.status === 'completed' && '처리가 완료되었습니다'}
                {progress.status === 'processing' && '처리 중입니다...'}
                {progress.status === 'failed' && '처리에 실패했습니다'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 진행률 바 */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>진행률</span>
                  <span className="font-bold">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {progress.processedCount} / {progress.totalCount}
                  </span>
                  {progress.processingSpeed && (
                    <span>{progress.processingSpeed.toFixed(1)} 건/초</span>
                  )}
                </div>
              </div>

              {/* 통계 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">성공</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {progress.successCount}
                  </div>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium">실패</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {progress.failedCount}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">처리 중</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {progress.totalCount - progress.processedCount}
                  </div>
                </div>
              </div>

              {/* 현재 처리 중인 주소 */}
              {progress.currentAddress && progress.status === 'processing' && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">
                    현재 처리 중인 주소:
                  </div>
                  <div className="font-mono text-sm">{progress.currentAddress}</div>
                </div>
              )}

              {/* 예상 소요 시간 */}
              {progress.estimatedTimeRemaining && progress.status === 'processing' && (
                <div className="text-sm text-muted-foreground text-center">
                  예상 남은 시간: {Math.ceil(progress.estimatedTimeRemaining / 1000)}초
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 4. 결과 및 다운로드 */}
        {jobId && progress?.status === 'completed' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                4. 결과 및 다운로드
              </CardTitle>
              <CardDescription>처리가 완료되었습니다. 결과를 확인하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => window.open(`/viewer?jobId=${jobId}`, '_blank')}
                >
                  <Map className="mr-2 h-4 w-4" />
                  지도에서 보기
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`/api/download/report_${jobId}.md`, '_blank')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  리포트 다운로드 (MD)
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`/api/download/results_${jobId}.csv`, '_blank')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  결과 다운로드 (CSV)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
