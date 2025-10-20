/**
 * 데이터 검증 모듈 인덱스
 */

// 간단한 통계 계산 함수
export function calculateDataStatistics(rows: Record<string, any>[], headers: string[]) {
  return {
    totalRows: rows.length,
    totalColumns: headers.length,
    emptyRows: rows.filter(row => 
      Object.values(row).every(value => !value || value.toString().trim() === '')
    ).length,
    headers,
  };
}