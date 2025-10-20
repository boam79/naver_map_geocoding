/**
 * 데이터 검증 모듈
 * - 파일 크기/형식 검증
 * - 매직 바이트 검증
 * - 데이터 통계
 * - 주소 형식 검증
 * - 좌표 범위 검증
 */

import type {
  FileValidationResult,
  DataStatistics,
  AddressValidation,
  CoordinateValidation,
} from './types';
import {
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  MAGIC_BYTES,
  KOREA_BOUNDS,
  ADDRESS_VALIDATION_THRESHOLDS,
} from './types';

/**
 * 파일 확장자 추출
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * 파일 확장자 검증
 */
export function validateFileExtension(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * 파일 크기 검증
 */
export function validateFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * 매직 바이트 검증
 * 파일의 실제 타입을 확인
 */
export async function validateMagicBytes(file: File): Promise<string | null> {
  try {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');
    
    // XLSX (ZIP 포맷)
    if (hex.startsWith('504B0304')) {
      return 'xlsx';
    }
    
    // XLS (OLE2 포맷)
    if (hex.startsWith('D0CF11E0')) {
      return 'xls';
    }
    
    // CSV/TSV는 텍스트 파일이므로 매직 바이트가 없음
    // 확장자로 판별
    const ext = getFileExtension(file.name);
    if (ext === 'csv' || ext === 'tsv') {
      return ext;
    }
    
    return null;
  } catch (error) {
    console.error('Magic byte validation failed:', error);
    return null;
  }
}

/**
 * 파일 검증 (종합)
 */
export async function validateFile(file: File): Promise<FileValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ext = getFileExtension(file.name);
  
  // 확장자 검증
  if (!validateFileExtension(file.name)) {
    errors.push(
      `지원되지 않는 파일 형식입니다. 지원 형식: ${ALLOWED_EXTENSIONS.join(', ')}`
    );
  }
  
  // 파일 크기 검증
  if (!validateFileSize(file.size)) {
    if (file.size === 0) {
      errors.push('파일이 비어있습니다.');
    } else {
      errors.push(`파일 크기가 제한을 초과했습니다. (최대: ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }
  }
  
  // 매직 바이트 검증
  const actualType = await validateMagicBytes(file);
  if (actualType && actualType !== ext) {
    warnings.push(`파일 확장자(${ext})와 실제 파일 타입(${actualType})이 일치하지 않습니다.`);
  } else if (!actualType && ext !== 'csv' && ext !== 'tsv') {
    warnings.push('파일 타입을 확인할 수 없습니다.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fileName: file.name,
    fileSize: file.size,
    fileType: ext,
    actualType: actualType || undefined,
  };
}

/**
 * 데이터 통계 계산
 */
export function calculateDataStatistics(
  data: Record<string, any>[],
  headers: string[]
): DataStatistics {
  const totalRows = data.length;
  const totalColumns = headers.length;
  
  // 빈 값 개수 (컬럼별)
  const emptyValues: Record<string, number> = {};
  headers.forEach((header) => {
    emptyValues[header] = data.filter((row) => {
      const value = row[header];
      return value === null || value === undefined || value === '';
    }).length;
  });
  
  // 주소 컬럼 찾기 (간단한 휴리스틱)
  const addressColumn = headers.find(
    (h) =>
      h.includes('주소') ||
      h.includes('address') ||
      h.includes('도로명') ||
      h.includes('지번')
  );
  
  let duplicateCount = 0;
  let uniqueAddresses = 0;
  
  if (addressColumn) {
    const addresses = data.map((row) => row[addressColumn]).filter(Boolean);
    uniqueAddresses = new Set(addresses).size;
    duplicateCount = addresses.length - uniqueAddresses;
  }
  
  // 예상 처리 시간 계산 (대략적)
  // 가정: 1000건당 약 30초 (API 호출 + 처리)
  const estimatedProcessingTime = Math.ceil((totalRows / 1000) * 30);
  
  return {
    totalRows,
    totalColumns,
    emptyValues,
    duplicateCount,
    uniqueAddresses,
    estimatedProcessingTime,
  };
}

/**
 * 주소 형식 검증
 */
export function validateAddress(address: string): AddressValidation {
  if (!address || typeof address !== 'string') {
    return {
      isValid: false,
      confidence: 0,
      issues: ['주소가 비어있거나 유효하지 않습니다.'],
      isForeignAddress: false,
      hasEnglish: false,
      tokenCount: 0,
      hasAdministrativeArea: false,
    };
  }
  
  const trimmed = address.trim();
  const issues: string[] = [];
  let confidence = 100;
  
  // 토큰 수 확인
  const tokens = trimmed.split(/\s+/);
  const tokenCount = tokens.length;
  
  if (tokenCount < ADDRESS_VALIDATION_THRESHOLDS.MIN_TOKENS) {
    issues.push('주소가 너무 짧습니다.');
    confidence -= 30;
  }
  
  // 영문 포함 여부 (외국 주소 감지)
  const hasEnglish = /[a-zA-Z]/.test(trimmed);
  if (hasEnglish) {
    const englishRatio = (trimmed.match(/[a-zA-Z]/g) || []).length / trimmed.length;
    if (englishRatio > 0.3) {
      issues.push('외국 주소로 의심됩니다.');
      confidence -= 50;
    }
  }
  
  // 한글 포함 여부
  const hasKorean = /[가-힣]/.test(trimmed);
  if (!hasKorean && !hasEnglish) {
    issues.push('유효한 문자를 찾을 수 없습니다.');
    confidence -= 40;
  }
  
  // 행정구역 포함 여부 (시/도/구/군/동/읍/면)
  const administrativeAreas = ['시', '도', '구', '군', '동', '읍', '면', '로', '길'];
  const hasAdministrativeArea = administrativeAreas.some((area) => trimmed.includes(area));
  
  if (!hasAdministrativeArea) {
    issues.push('행정구역 정보가 부족합니다.');
    confidence -= 20;
  }
  
  // 숫자만 있는지 확인
  if (/^\d+$/.test(trimmed)) {
    issues.push('주소가 숫자로만 구성되어 있습니다.');
    confidence -= 50;
  }
  
  // 특수문자만 있는지 확인
  if (/^[^가-힣a-zA-Z0-9]+$/.test(trimmed)) {
    issues.push('주소가 특수문자로만 구성되어 있습니다.');
    confidence -= 50;
  }
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    isValid: confidence >= ADDRESS_VALIDATION_THRESHOLDS.CONFIDENCE_LOW,
    confidence,
    issues,
    isForeignAddress: hasEnglish && !hasKorean,
    hasEnglish,
    tokenCount,
    hasAdministrativeArea,
  };
}

/**
 * 좌표 범위 검증 (한국 좌표인지 확인)
 */
export function validateCoordinates(lat: number, lng: number): CoordinateValidation {
  const isInKorea =
    lat >= KOREA_BOUNDS.LAT_MIN &&
    lat <= KOREA_BOUNDS.LAT_MAX &&
    lng >= KOREA_BOUNDS.LNG_MIN &&
    lng <= KOREA_BOUNDS.LNG_MAX;
  
  // 한국 중심 좌표 (대략적)
  const koreaCenter = { lat: 36.5, lng: 127.5 };
  
  // 하버사인 공식으로 거리 계산 (km)
  const R = 6371; // 지구 반지름 (km)
  const dLat = ((koreaCenter.lat - lat) * Math.PI) / 180;
  const dLng = ((koreaCenter.lng - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((koreaCenter.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return {
    isValid: !isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180,
    lat,
    lng,
    isInKorea,
    distance,
  };
}

/**
 * 배치 주소 검증
 * 데이터셋의 주소들을 검증하고 통계 반환
 */
export function validateAddressBatch(
  data: Record<string, any>[],
  addressColumn: string
): {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  foreignCount: number;
  averageConfidence: number;
  lowConfidenceAddresses: Array<{ index: number; address: string; confidence: number }>;
} {
  const results = data.map((row, index) => ({
    index,
    address: row[addressColumn],
    ...validateAddress(row[addressColumn]),
  }));
  
  const validCount = results.filter((r) => r.isValid).length;
  const invalidCount = results.length - validCount;
  const foreignCount = results.filter((r) => r.isForeignAddress).length;
  const averageConfidence =
    results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  
  const lowConfidenceAddresses = results
    .filter((r) => r.confidence < ADDRESS_VALIDATION_THRESHOLDS.CONFIDENCE_HIGH)
    .map((r) => ({
      index: r.index,
      address: r.address,
      confidence: r.confidence,
    }))
    .slice(0, 20); // 최대 20개만
  
  return {
    totalCount: results.length,
    validCount,
    invalidCount,
    foreignCount,
    averageConfidence,
    lowConfidenceAddresses,
  };
}

