/**
 * Markdown 리포트 생성 모듈
 */

import { aggregateAddresses, generateAddressCountTable } from '@/lib/agg/address';
import { aggregateBySgg, generateSggCountTable } from '@/lib/agg/sgg';
import type { ProcessedAddress } from '@/lib/batch/types';

export interface ReportData {
  jobId: string;
  fileName: string;
  processedAt: Date;
  results: ProcessedAddress[];
  totalCount: number;
  successCount: number;
  failedCount: number;
  processingTime: number; // ms
}

export interface ReportOptions {
  topN?: number;
  includeMap?: boolean;
  includeErrors?: boolean;
}

/**
 * Markdown 리포트 생성
 */
export function generateMarkdownReport(
  data: ReportData,
  options: ReportOptions = {}
): string {
  const { topN = 20, includeMap = true, includeErrors = true } = options;
  
  const { results, totalCount, successCount, failedCount, processingTime, fileName, processedAt } =
    data;
  
  // 성공한 주소만 추출
  const successfulAddresses = results
    .filter((r) => r.status === 'success')
    .map((r) => r.normalizedAddress)
    .filter((addr): addr is string => addr !== undefined);
  
  // 동일 주소 집계
  const addressAgg = aggregateAddresses(successfulAddresses, topN);
  
  // 시군구별 집계
  const sggAgg = aggregateBySgg(successfulAddresses, topN);
  
  // Confidence 분포
  const avgConfidence =
    results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length;
  
  const highConf = results.filter((r) => (r.confidence || 0) >= 85).length;
  const midConf = results.filter((r) => (r.confidence || 0) >= 70 && (r.confidence || 0) < 85).length;
  const lowConf = results.filter((r) => (r.confidence || 0) < 70).length;
  
  // 에러 집계
  const errors = results.filter((r) => r.status === 'failed');
  const errorTypes = new Map<string, number>();
  errors.forEach((e) => {
    const errorMsg = e.error || '알 수 없는 오류';
    errorTypes.set(errorMsg, (errorTypes.get(errorMsg) || 0) + 1);
  });
  
  // Markdown 생성
  const sections: string[] = [];
  
  // 제목
  sections.push(`# 신환 주소 분석 리포트\n`);
  sections.push(`**생성일시:** ${processedAt.toLocaleString('ko-KR')}\n`);
  sections.push(`**원본 파일:** ${fileName}\n`);
  sections.push(`---\n`);
  
  // 요약
  sections.push(`## 📊 요약\n`);
  sections.push(`- **총 건수:** ${totalCount.toLocaleString()}건`);
  sections.push(`- **성공:** ${successCount.toLocaleString()}건 (${((successCount / totalCount) * 100).toFixed(1)}%)`);
  sections.push(`- **실패:** ${failedCount.toLocaleString()}건 (${((failedCount / totalCount) * 100).toFixed(1)}%)`);
  sections.push(`- **처리 시간:** ${(processingTime / 1000).toFixed(1)}초`);
  sections.push(`- **평균 신뢰도:** ${avgConfidence.toFixed(1)}점\n`);
  
  // 지도 (옵션)
  if (includeMap) {
    sections.push(`## 🗺️ 지도 시각화\n`);
    sections.push(`![주소 분포 지도](./map_${data.jobId}.png)\n`);
    sections.push(`> 히트맵으로 주소 밀집도를 표시합니다.\n`);
  }
  
  // 동일 주소 개수 통계
  sections.push(`## 📍 동일 주소 개수 통계 (Top ${topN})\n`);
  sections.push(`- **전체 주소 수:** ${addressAgg.total.toLocaleString()}건`);
  sections.push(`- **고유 주소 수:** ${addressAgg.unique.toLocaleString()}건`);
  sections.push(`- **중복 주소 수:** ${addressAgg.duplicates.toLocaleString()}건\n`);
  sections.push(generateAddressCountTable(addressAgg.topAddresses));
  sections.push('');
  
  // 시군구별 통계
  sections.push(`## 🏘️ 시군구별 통계 (Top ${topN})\n`);
  sections.push(`- **집계된 시군구:** ${sggAgg.topSgg.length}개`);
  sections.push(`- **유효 주소:** ${sggAgg.total.toLocaleString()}건\n`);
  sections.push(generateSggCountTable(sggAgg.topSgg));
  sections.push('');
  
  // Confidence 분포
  sections.push(`## 📈 신뢰도 분포\n`);
  sections.push(`- **높음 (≥85점):** ${highConf}건 (${((highConf / totalCount) * 100).toFixed(1)}%)`);
  sections.push(`- **보통 (70-84점):** ${midConf}건 (${((midConf / totalCount) * 100).toFixed(1)}%)`);
  sections.push(`- **낮음 (<70점):** ${lowConf}건 (${((lowConf / totalCount) * 100).toFixed(1)}%)\n`);
  
  // 에러 요약 (옵션)
  if (includeErrors && errors.length > 0) {
    sections.push(`## ⚠️ 에러 요약\n`);
    sections.push(`총 ${errors.length}건의 에러가 발생했습니다.\n`);
    
    if (errorTypes.size > 0) {
      sections.push(`### 에러 유형별 통계\n`);
      sections.push('| 에러 유형 | 건수 |');
      sections.push('|-----------|------|');
      
      const sortedErrors = Array.from(errorTypes.entries()).sort((a, b) => b[1] - a[1]);
      sortedErrors.slice(0, 10).forEach(([error, count]) => {
        sections.push(`| ${error} | ${count} |`);
      });
      sections.push('');
    }
    
    // 실패한 주소 샘플 (최대 5개)
    if (errors.length > 0) {
      sections.push(`### 실패한 주소 샘플\n`);
      errors.slice(0, 5).forEach((e, i) => {
        sections.push(`${i + 1}. **${e.originalAddress}**`);
        sections.push(`   - 오류: ${e.error || '알 수 없음'}\n`);
      });
    }
  }
  
  // 푸터
  sections.push(`---\n`);
  sections.push(`*이 리포트는 신환 주소 분석 시스템에 의해 자동 생성되었습니다.*`);
  
  return sections.join('\n');
}

/**
 * 리포트 파일명 생성
 */
export function generateReportFileName(jobId: string): string {
  return `report_${jobId}.md`;
}

