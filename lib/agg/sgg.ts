/**
 * 시군구별 집계 모듈
 * - 광역시/도 + 시/군/구 단위 집계
 * - 내림차순 정렬
 */

export interface SggCount {
  province: string; // 시/도
  city: string; // 시/군/구
  fullName: string; // 전체명
  count: number;
  percentage: number;
}

export interface SggAggregationResult {
  total: number;
  topSgg: SggCount[];
  provinceStats: Map<string, number>;
}

/**
 * 주소에서 시군구 추출
 */
function extractSgg(address: string): { province: string; city: string; fullName: string } | null {
  if (!address) return null;
  
  // 광역시/도 패턴
  const provincePattern = /^([가-힣]+(?:특별시|광역시|특별자치시|특별자치도|도))/;
  const provinceMatch = address.match(provincePattern);
  
  if (!provinceMatch) return null;
  
  const province = provinceMatch[1];
  
  // 시/군/구 패턴
  const cityPattern = /([가-힣]+(?:시|군|구))/;
  const remainingAddress = address.substring(province.length).trim();
  const cityMatch = remainingAddress.match(cityPattern);
  
  const city = cityMatch ? cityMatch[1] : '';
  const fullName = city ? `${province} ${city}` : province;
  
  return { province, city, fullName };
}

/**
 * 시군구별 집계
 */
export function aggregateBySgg(
  addresses: string[],
  topN: number = 20
): SggAggregationResult {
  const sggCountMap = new Map<string, SggCount>();
  const provinceCountMap = new Map<string, number>();
  
  let validCount = 0;
  
  for (const address of addresses) {
    if (!address || typeof address !== 'string') continue;
    
    const extracted = extractSgg(address);
    if (!extracted) continue;
    
    const { province, city, fullName } = extracted;
    
    // 시군구 카운트
    if (!sggCountMap.has(fullName)) {
      sggCountMap.set(fullName, {
        province,
        city,
        fullName,
        count: 0,
        percentage: 0,
      });
    }
    
    const entry = sggCountMap.get(fullName)!;
    entry.count++;
    
    // 광역시/도 카운트
    provinceCountMap.set(province, (provinceCountMap.get(province) || 0) + 1);
    
    validCount++;
  }
  
  // 퍼센티지 계산
  for (const entry of sggCountMap.values()) {
    entry.percentage = (entry.count / validCount) * 100;
  }
  
  // 내림차순 정렬 후 Top-N
  const sorted = Array.from(sggCountMap.values()).sort((a, b) => b.count - a.count);
  const topSgg = sorted.slice(0, topN);
  
  return {
    total: validCount,
    topSgg,
    provinceStats: provinceCountMap,
  };
}

/**
 * Markdown 테이블 생성
 */
export function generateSggCountTable(counts: SggCount[]): string {
  if (counts.length === 0) {
    return '데이터가 없습니다.';
  }
  
  const rows = counts.map((item, index) => {
    return `| ${index + 1} | ${item.fullName} | ${item.count} | ${item.percentage.toFixed(1)}% |`;
  });
  
  return [
    '| 순위 | 시군구 | 건수 | 비율 |',
    '|------|--------|------|------|',
    ...rows,
  ].join('\n');
}

/**
 * CSV 형식 생성
 */
export function generateSggCountCSV(counts: SggCount[]): string {
  const header = '순위,시도,시군구,전체명,건수,비율(%)';
  const rows = counts.map((item, index) => {
    return `${index + 1},"${item.province}","${item.city}","${item.fullName}",${item.count},${item.percentage.toFixed(1)}`;
  });
  
  return [header, ...rows].join('\n');
}

