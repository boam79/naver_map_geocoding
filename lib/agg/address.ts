/**
 * 동일 주소 개수 집계 모듈
 * - 정규화된 주소 기준 중복 카운트
 * - 내림차순 정렬
 * - Top-N 추출
 */

import { normalizeAddress } from '@/lib/addr/normalize';

export interface AddressCount {
  address: string;
  normalizedAddress: string;
  count: number;
  percentage: number;
}

export interface AddressAggregationResult {
  total: number;
  unique: number;
  duplicates: number;
  topAddresses: AddressCount[];
  allCounts: Map<string, AddressCount>;
}

/**
 * 동일 주소 개수 집계
 */
export function aggregateAddresses(
  addresses: string[],
  topN: number = 20
): AddressAggregationResult {
  const countMap = new Map<string, { original: string; count: number }>();
  
  // 정규화하면서 카운트
  for (const address of addresses) {
    if (!address || typeof address !== 'string') continue;
    
    const normalized = normalizeAddress(address).normalized;
    
    if (!countMap.has(normalized)) {
      countMap.set(normalized, { original: address, count: 0 });
    }
    
    const entry = countMap.get(normalized)!;
    entry.count++;
  }
  
  // AddressCount 형식으로 변환
  const allCounts = new Map<string, AddressCount>();
  const total = addresses.filter(Boolean).length;
  
  for (const [normalized, { original, count }] of countMap.entries()) {
    allCounts.set(normalized, {
      address: original,
      normalizedAddress: normalized,
      count,
      percentage: (count / total) * 100,
    });
  }
  
  // 내림차순 정렬 후 Top-N
  const sorted = Array.from(allCounts.values()).sort((a, b) => b.count - a.count);
  const topAddresses = sorted.slice(0, topN);
  
  const unique = allCounts.size;
  const duplicates = total - unique;
  
  return {
    total,
    unique,
    duplicates,
    topAddresses,
    allCounts,
  };
}

/**
 * Markdown 테이블 생성
 */
export function generateAddressCountTable(counts: AddressCount[]): string {
  if (counts.length === 0) {
    return '데이터가 없습니다.';
  }
  
  const rows = counts.map((item, index) => {
    return `| ${index + 1} | ${item.normalizedAddress} | ${item.count} | ${item.percentage.toFixed(1)}% |`;
  });
  
  return [
    '| 순위 | 주소 | 건수 | 비율 |',
    '|------|------|------|------|',
    ...rows,
  ].join('\n');
}

/**
 * CSV 형식 생성
 */
export function generateAddressCountCSV(counts: AddressCount[]): string {
  const header = '순위,주소,건수,비율(%)';
  const rows = counts.map((item, index) => {
    return `${index + 1},"${item.normalizedAddress}",${item.count},${item.percentage.toFixed(1)}`;
  });
  
  return [header, ...rows].join('\n');
}

