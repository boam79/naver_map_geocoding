/**
 * 지오코딩 관련 타입 정의
 */

export interface NaverGeocodeRequest {
  query: string;
}

export interface NaverGeocodeResponse {
  status: string;
  meta: {
    totalCount: number;
    page: number;
    count: number;
  };
  addresses: NaverAddress[];
  errorMessage?: string;
}

export interface NaverAddress {
  roadAddress: string;
  jibunAddress: string;
  englishAddress: string;
  addressElements: AddressElement[];
  x: string; // 경도 (longitude)
  y: string; // 위도 (latitude)
  distance: number;
}

export interface AddressElement {
  types: string[];
  longName: string;
  shortName: string;
  code: string;
}

export interface GeocodeResult {
  address: string;
  lat?: number;
  lng?: number;
  status: 'success' | 'failed' | 'partial';
  confidence: number;
  roadAddress?: string;
  jibunAddress?: string;
  englishAddress?: string;
  addressElements?: AddressElement[];
  error?: string;
  retryCount?: number;
}

export interface GeocodeClientOptions {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface RateLimiter {
  acquire(): Promise<void>;
  getQueueSize(): number;
}

