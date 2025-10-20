/**
 * 주소 정규화 모듈
 * - 공백·특수문자 제거
 * - 약어 확장
 * - 오타 보정 (Fuzzy matching)
 */

import type { NormalizedAddress } from './types';

/**
 * 약어 확장 매핑
 */
const ABBREVIATION_MAP: Record<string, string> = {
  '서울': '서울특별시',
  '서울시': '서울특별시',
  '부산': '부산광역시',
  '부산시': '부산광역시',
  '대구': '대구광역시',
  '대구시': '대구광역시',
  '인천': '인천광역시',
  '인천시': '인천광역시',
  '광주': '광주광역시',
  '광주시': '광주광역시',
  '대전': '대전광역시',
  '대전시': '대전광역시',
  '울산': '울산광역시',
  '울산시': '울산광역시',
  '세종': '세종특별자치시',
  '세종시': '세종특별자치시',
  '경기': '경기도',
  '강원': '강원도',
  '충북': '충청북도',
  '충남': '충청남도',
  '전북': '전라북도',
  '전북특별자치도': '전북특별자치도',
  '전남': '전라남도',
  '경북': '경상북도',
  '경남': '경상남도',
  '제주': '제주특별자치도',
  '제주도': '제주특별자치도',
};

/**
 * 일반적인 오타 패턴
 */
const TYPO_CORRECTIONS: Array<[RegExp, string]> = [
  [/(\d)\s+(\d)/g, '$1-$2'], // 숫자 사이 공백 → 하이픈
  [/\s{2,}/g, ' '], // 다중 공백 → 단일 공백
  [/　/g, ' '], // 전각 공백 → 반각 공백
  [/([가-힣])\s+([가-힣])/g, '$1 $2'], // 한글 사이 공백 정리
];

/**
 * 주소 패턴
 */
const ADDRESS_PATTERNS = {
  hasAdminArea: /(특별시|광역시|특별자치시|특별자치도|도|시|군|구)/,
};

/**
 * 기본 정규화
 * - 앞뒤 공백 제거
 * - 다중 공백 정리
 * - 특수문자 정리
 */
function basicNormalize(address: string): string {
  let normalized = address.trim();
  
  // 오타 교정 패턴 적용
  for (const [pattern, replacement] of TYPO_CORRECTIONS) {
    normalized = normalized.replace(pattern, replacement);
  }
  
  return normalized;
}

/**
 * 약어 확장
 */
function expandAbbreviations(address: string): { expanded: string; applied: string[] } {
  let expanded = address;
  const applied: string[] = [];
  
  for (const [abbr, full] of Object.entries(ABBREVIATION_MAP)) {
    // 정확한 매칭 (단어 경계 고려)
    const regex = new RegExp(`^${abbr}\\s+|\\s+${abbr}\\s+`, 'g');
    if (regex.test(expanded) || expanded.startsWith(abbr + ' ')) {
      expanded = expanded.replace(new RegExp(`^${abbr}(?=\\s)`, 'g'), full);
      expanded = expanded.replace(new RegExp(`\\s${abbr}(?=\\s)`, 'g'), ` ${full}`);
      applied.push(`${abbr} → ${full}`);
    }
  }
  
  return { expanded, applied };
}

/**
 * 주소 정규화 (통합)
 */
export function normalizeAddress(address: string): NormalizedAddress {
  if (!address || typeof address !== 'string') {
    return {
      original: address,
      normalized: '',
      confidence: 0,
      corrections: ['주소가 유효하지 않습니다.'],
    };
  }
  
  const corrections: string[] = [];
  let normalized = address;
  let confidence = 100;
  
  // 1. 기본 정규화
  const beforeBasic = normalized;
  normalized = basicNormalize(normalized);
  if (normalized !== beforeBasic) {
    corrections.push('공백 및 특수문자 정리');
  }
  
  // 2. 약어 확장
  const { expanded, applied } = expandAbbreviations(normalized);
  normalized = expanded;
  if (applied.length > 0) {
    corrections.push(...applied);
    confidence += 5; // 약어 확장 시 신뢰도 증가
  }
  
  // 3. 빈 주소 확인
  if (!normalized.trim()) {
    confidence = 0;
    corrections.push('주소가 비어있습니다.');
  }
  
  // 4. 최소 길이 확인
  if (normalized.length < 5) {
    confidence -= 20;
    corrections.push('주소가 너무 짧습니다.');
  }
  
  // 5. 행정구역 포함 여부
  if (!ADDRESS_PATTERNS.hasAdminArea.test(normalized)) {
    confidence -= 15;
    corrections.push('행정구역 정보가 부족합니다.');
  }
  
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    original: address,
    normalized,
    confidence,
    corrections: corrections.length > 0 ? corrections : ['정규화 완료'],
  };
}

/**
 * 배치 정규화
 */
export function normalizeAddressBatch(
  addresses: string[]
): NormalizedAddress[] {
  return addresses.map((addr) => normalizeAddress(addr));
}

/**
 * 중복 주소 제거 (정규화된 주소 기준)
 */
export function deduplicateAddresses(
  addresses: string[]
): { unique: string[]; duplicates: Map<string, number> } {
  const normalized = addresses.map((addr) => normalizeAddress(addr).normalized);
  const countMap = new Map<string, number>();
  
  for (const addr of normalized) {
    countMap.set(addr, (countMap.get(addr) || 0) + 1);
  }
  
  const unique = Array.from(countMap.keys());
  
  return { unique, duplicates: countMap };
}

