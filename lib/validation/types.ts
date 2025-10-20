/**
 * 데이터 검증 관련 타입 정의
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileValidationResult extends ValidationResult {
  fileName: string;
  fileSize: number;
  fileType: string;
  actualType?: string; // 매직 바이트로 감지된 실제 타입
}

export interface DataStatistics {
  totalRows: number;
  totalColumns: number;
  emptyValues: Record<string, number>; // 컬럼별 빈 값 개수
  duplicateCount: number;
  uniqueAddresses: number;
  estimatedProcessingTime: number; // 초 단위
}

export interface AddressValidation {
  isValid: boolean;
  confidence: number; // 0-100
  issues: string[];
  isForeignAddress: boolean;
  hasEnglish: boolean;
  tokenCount: number;
  hasAdministrativeArea: boolean; // 시/도/구/군 포함 여부
}

export interface CoordinateValidation {
  isValid: boolean;
  lat: number;
  lng: number;
  isInKorea: boolean;
  distance?: number; // 한국 중심으로부터의 거리 (km)
}

export const MAGIC_BYTES: Record<string, string[]> = {
  xlsx: ['504B0304'], // ZIP 포맷 (XLSX는 ZIP 기반)
  xls: ['D0CF11E0'], // OLE2 포맷
  csv: [''], // CSV는 매직 바이트가 없음
  tsv: [''], // TSV도 매직 바이트가 없음
};

export const MAX_FILE_SIZE = 52428800; // 50MB
export const ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv', 'tsv'];

// 한국 좌표 범위
export const KOREA_BOUNDS = {
  LAT_MIN: 33,
  LAT_MAX: 43,
  LNG_MIN: 124,
  LNG_MAX: 132,
};

// 주소 검증 임계값
export const ADDRESS_VALIDATION_THRESHOLDS = {
  MIN_TOKENS: 2, // 최소 토큰 수
  CONFIDENCE_LOW: 70,
  CONFIDENCE_HIGH: 85,
};

