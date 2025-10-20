/**
 * 배치 처리 관련 타입 정의
 */

export interface JobProgress {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  totalCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  currentAddress?: string;
  startTime: number;
  endTime?: number;
  estimatedTimeRemaining?: number; // 초 단위
  processingSpeed?: number; // 초당 건수
  error?: string;
  checkpoints: CheckpointInfo[];
}

export interface CheckpointInfo {
  timestamp: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
}

export interface ProcessedAddress {
  originalAddress: string;
  normalizedAddress?: string;
  sido?: string;
  sigungu?: string;
  success: boolean;
  error?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  confidence?: number;
  status?: 'success' | 'failed' | 'skipped';
  geocodeResponse?: any;
}