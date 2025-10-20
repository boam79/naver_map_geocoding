/**
 * 주소 컬럼 자동 감지 모듈
 */

export interface AddressColumn {
  name: string;
  confidence: number;
  reason: string;
}

export interface DetectedAddressColumn {
  column: string;
  confidence: number;
  details: {
    headerMatch: number;
    valueMatch: number;
    sampleValues: string[];
  };
}

/**
 * 주소 컬럼 자동 감지
 */
export function detectAddressColumn(
  headers: string[],
  rows: Record<string, any>[]
): DetectedAddressColumn | null {
  if (!headers.length || !rows.length) {
    return null;
  }

  const candidates: AddressColumn[] = [];

  // 각 컬럼을 검사
  headers.forEach((header) => {
    const confidence = calculateColumnConfidence(header, rows);
    if (confidence > 0) {
      candidates.push({
        name: header,
        confidence,
        reason: `헤더: ${header}`,
      });
    }
  });

  // 신뢰도 순으로 정렬
  candidates.sort((a, b) => b.confidence - a.confidence);

  if (candidates.length === 0) {
    return null;
  }

  const best = candidates[0];
  
  // 샘플 값들 추출 (최대 5개)
  const sampleValues = rows
    .slice(0, 5)
    .map(row => row[best.name])
    .filter(value => value && value.toString().trim())
    .map(value => value.toString().trim());

  return {
    column: best.name,
    confidence: best.confidence,
    details: {
      headerMatch: getHeaderConfidence(best.name),
      valueMatch: getValueConfidence(rows, best.name),
      sampleValues,
    },
  };
}

/**
 * 컬럼의 주소 신뢰도 계산
 */
function calculateColumnConfidence(header: string, rows: Record<string, any>[]): number {
  const headerConfidence = getHeaderConfidence(header);
  const valueConfidence = getValueConfidence(rows, header);
  
  // 헤더 60% + 값 패턴 40%
  return headerConfidence * 0.6 + valueConfidence * 0.4;
}

/**
 * 헤더 기반 신뢰도 계산
 */
function getHeaderConfidence(header: string): number {
  const headerLower = header.toLowerCase();
  
  // 주소 관련 키워드
  const addressKeywords = [
    { pattern: '주소', weight: 100 },
    { pattern: 'address', weight: 100 },
    { pattern: '도로명', weight: 90 },
    { pattern: '지번', weight: 90 },
    { pattern: 'addr', weight: 85 },
    { pattern: '주소지', weight: 80 },
    { pattern: '거주지', weight: 70 },
    { pattern: '본적', weight: 70 },
    { pattern: '위치', weight: 60 },
    { pattern: 'location', weight: 60 },
    { pattern: '주민', weight: 50 },
    { pattern: '고객', weight: 30 },
    { pattern: '환자', weight: 30 },
  ];

  for (const keyword of addressKeywords) {
    if (headerLower.includes(keyword.pattern)) {
      return keyword.weight;
    }
  }

  // 부분 매칭
  const partialMatches = [
    { pattern: '주', weight: 40 },
    { pattern: '지', weight: 30 },
    { pattern: '위', weight: 20 },
  ];

  for (const match of partialMatches) {
    if (headerLower.includes(match.pattern)) {
      return match.weight;
    }
  }

  return 0;
}

/**
 * 값 패턴 기반 신뢰도 계산
 */
function getValueConfidence(rows: Record<string, any>[], columnName: string): number {
  if (!rows.length) return 0;

  const sampleSize = Math.min(10, rows.length);
  const sampleRows = rows.slice(0, sampleSize);
  
  let addressPatternMatches = 0;
  let totalValidValues = 0;

  sampleRows.forEach((row) => {
    const value = row[columnName];
    if (!value || typeof value !== 'string') return;

    const trimmedValue = value.trim();
    if (trimmedValue.length < 3) return; // 너무 짧은 값 제외

    totalValidValues++;

    // 한국 주소 패턴 검사
    if (isKoreanAddress(trimmedValue)) {
      addressPatternMatches++;
    }
  });

  if (totalValidValues === 0) return 0;

  return (addressPatternMatches / totalValidValues) * 100;
}

/**
 * 한국 주소 패턴 검사
 */
function isKoreanAddress(value: string): boolean {
  const addressPatterns = [
    // 시/도 패턴
    /서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도/,
    
    // 시/군/구 패턴
    /시\s|군\s|구\s|동\s|읍\s|면\s/,
    
    // 도로명 패턴
    /로\s\d+|길\s\d+|대로\s\d+/,
    
    // 건물번호 패턴
    /\d+-\d+|\d+번지/,
    
    // 일반적인 한국 주소 키워드
    /아파트|빌라|상가|건물|동\s\d+호|층/,
    
    // 시/도 약어
    /서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주/,
  ];

  return addressPatterns.some(pattern => pattern.test(value));
}

/**
 * 주소 컬럼 후보 목록 반환
 */
export function getAddressColumnCandidates(
  headers: string[],
  rows: Record<string, any>[]
): AddressColumn[] {
  const candidates: AddressColumn[] = [];

  headers.forEach((header) => {
    const confidence = calculateColumnConfidence(header, rows);
    if (confidence > 20) { // 20% 이상 신뢰도만 후보로 추가
      candidates.push({
        name: header,
        confidence,
        reason: `헤더: ${header} (신뢰도: ${confidence.toFixed(1)}%)`,
      });
    }
  });

  return candidates.sort((a, b) => b.confidence - a.confidence);
}