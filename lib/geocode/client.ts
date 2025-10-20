/**
 * 네이버 지오코딩 클라이언트
 * - Rate limiting
 * - 자동 재시도
 * - 캐싱
 */

import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { RateLimiter } from './rate-limiter';
import type {
  GeocodeResult,
  NaverGeocodeResponse,
  GeocodeClientOptions,
} from './types';

export class GeocodeClient {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private cache: Map<string, GeocodeResult> = new Map();
  private options: Required<GeocodeClientOptions>;
  
  constructor(options: GeocodeClientOptions) {
    this.options = {
      baseUrl: 'https://maps.apigw.ntruss.com/map-geocode/v2/geocode',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      ...options,
    };
    
    // Axios 클라이언트 생성
    this.client = axios.create({
      baseURL: this.options.baseUrl,
      timeout: this.options.timeout,
      headers: {
        'x-ncp-apigw-api-key-id': this.options.clientId,
        'x-ncp-apigw-api-key': this.options.clientSecret,
        'Accept': 'application/json',
      },
    });
    
    // 자동 재시도 설정
    axiosRetry(this.client, {
      retries: this.options.maxRetries,
      retryDelay: (retryCount) => {
        return this.options.retryDelay * Math.pow(2, retryCount - 1); // 지수 백오프
      },
      retryCondition: (error) => {
        // 네트워크 오류 또는 5xx 에러만 재시도
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response?.status ?? 0) >= 500 ||
          error.response?.status === 429 // Rate limit
        );
      },
      onRetry: (retryCount, error) => {
        console.log(`Retry ${retryCount} for:`, error.config?.params?.query);
      },
    });
    
    // Rate Limiter 초기화
    const rateLimit = parseInt(process.env.API_RATE_LIMIT || '200', 10);
    const concurrency = parseInt(process.env.CONCURRENCY || '80', 10);
    this.rateLimiter = new RateLimiter(rateLimit, concurrency);
  }
  
  /**
   * 주소 → 좌표 변환 (지오코딩)
   */
  async geocode(address: string, retryCount: number = 0): Promise<GeocodeResult> {
    // 캐시 확인
    const cached = this.cache.get(address);
    if (cached) {
      return { ...cached, retryCount };
    }
    
    // Rate limiting
    await this.rateLimiter.acquire();
    
    try {
      const response = await this.client.get<NaverGeocodeResponse>('', {
        params: { query: address },
      });
      
      const data = response.data;
      
      // API 응답 확인
      if (data.status !== 'OK' || !data.addresses || data.addresses.length === 0) {
        const result: GeocodeResult = {
          address,
          status: 'failed',
          confidence: 0,
          error: data.errorMessage || '주소를 찾을 수 없습니다.',
          retryCount,
        };
        
        this.cache.set(address, result);
        return result;
      }
      
      // 첫 번째 결과 사용 (가장 정확도 높음)
      const firstResult = data.addresses[0];
      
      const result: GeocodeResult = {
        address,
        lat: parseFloat(firstResult.y),
        lng: parseFloat(firstResult.x),
        status: 'success',
        confidence: 100 - firstResult.distance * 10, // distance 기반 신뢰도
        roadAddress: firstResult.roadAddress,
        jibunAddress: firstResult.jibunAddress,
        englishAddress: firstResult.englishAddress,
        addressElements: firstResult.addressElements,
        retryCount,
      };
      
      // 캐시 저장
      this.cache.set(address, result);
      
      return result;
    } catch (error) {
      console.error('Geocode error:', error);
      
      const result: GeocodeResult = {
        address,
        status: 'failed',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount,
      };
      
      return result;
    } finally {
      // Rate limiter 슬롯 해제
      this.rateLimiter.release();
    }
  }
  
  /**
   * 배치 지오코딩
   */
  async geocodeBatch(
    addresses: string[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<GeocodeResult[]> {
    const results: GeocodeResult[] = [];
    
    for (let i = 0; i < addresses.length; i++) {
      const result = await this.geocode(addresses[i]);
      results.push(result);
      
      if (onProgress) {
        onProgress(i + 1, addresses.length);
      }
    }
    
    return results;
  }
  
  /**
   * 캐시 크기
   */
  getCacheSize(): number {
    return this.cache.size;
  }
  
  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Rate Limiter 상태
   */
  getRateLimiterStatus() {
    return {
      queueSize: this.rateLimiter.getQueueSize(),
      activeCount: this.rateLimiter.getActiveCount(),
    };
  }
}

/**
 * 싱글톤 인스턴스 생성
 */
let geocodeClientInstance: GeocodeClient | null = null;

export function getGeocodeClient(): GeocodeClient {
  if (!geocodeClientInstance) {
    geocodeClientInstance = new GeocodeClient({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
      baseUrl: process.env.NAVER_GEOCODING_URL || 'https://maps.apigw.ntruss.com/map-geocode/v2/geocode',
      timeout: 30000,
      maxRetries: parseInt(process.env.RETRY_MAX || '3', 10),
      retryDelay: parseInt(process.env.RETRY_BACKOFF_BASE || '1000', 10) * 1000, // 초 → 밀리초 변환
    });
  }
  
  return geocodeClientInstance;
}

