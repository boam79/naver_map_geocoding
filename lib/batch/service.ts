/**
 * 배치 처리 서비스
 * 주소 정규화 → 지오코딩 → 결과 저장
 */

import { normalizeAddress } from '@/lib/addr/normalize';
import { getGeocodeClient } from '@/lib/geocode/client';
import { jobStore } from './job-store';
import type { GeocodeResult } from '@/lib/geocode/types';
import type { ProcessedAddress } from './types';

export interface BatchProcessOptions {
  jobId: string;
  addresses: string[];
  checkpointInterval?: number;
  onProgress?: (processed: number, total: number) => void;
}

/**
 * 배치 처리 메인 함수
 */
export async function processBatch(options: BatchProcessOptions): Promise<ProcessedAddress[]> {
  const { jobId, addresses, checkpointInterval = 100, onProgress } = options;
  
  const results: ProcessedAddress[] = [];
  const geocodeClient = getGeocodeClient();
  
  // Job 상태 업데이트
  jobStore.updateJob(jobId, { status: 'processing' });
  
  for (let i = 0; i < addresses.length; i++) {
    const originalAddress = addresses[i];
    
    try {
      // 1. 주소 정규화
      const normalized = normalizeAddress(originalAddress);
      
      // 2. 지오코딩 (정규화된 주소 사용)
      const geocodeResult = await geocodeClient.geocode(normalized.normalized);
      
      // 3. 결과 저장
      const processed: ProcessedAddress = {
        originalAddress,
        normalizedAddress: normalized.normalized,
        lat: geocodeResult.lat,
        lng: geocodeResult.lng,
        confidence: Math.min(normalized.confidence, geocodeResult.confidence),
        status: geocodeResult.status === 'success' ? 'success' : 'failed',
        success: geocodeResult.status === 'success',
        error: geocodeResult.error,
        geocodeResponse: {
          roadAddress: geocodeResult.roadAddress,
          jibunAddress: geocodeResult.jibunAddress,
        },
      };
      
      results.push(processed);
      
      // 4. Job 진행률 업데이트
      const job = jobStore.getJob(jobId);
      if (job) {
        jobStore.updateJob(jobId, {
          processedCount: i + 1,
          successCount: job.successCount + (processed.status === 'success' ? 1 : 0),
          failedCount: job.failedCount + (processed.status === 'failed' ? 1 : 0),
          currentAddress: originalAddress,
        });
      }
      
      // 5. 체크포인트 저장
      if ((i + 1) % checkpointInterval === 0) {
        jobStore.addCheckpoint(jobId);
        
        // TODO: 실제로는 파일로 저장
        console.log(`Checkpoint: ${i + 1}/${addresses.length}`);
      }
      
      // 6. 진행률 콜백
      if (onProgress) {
        onProgress(i + 1, addresses.length);
      }
    } catch (error) {
      console.error(`Error processing address ${i}:`, error);
      
      // 에러 발생 시에도 결과 저장
      results.push({
        originalAddress,
        normalizedAddress: originalAddress,
        confidence: 0,
        status: 'failed',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      const job = jobStore.getJob(jobId);
      if (job) {
        jobStore.updateJob(jobId, {
          processedCount: i + 1,
          failedCount: job.failedCount + 1,
        });
      }
    }
  }
  
  // 완료
  const endTime = Date.now();
  const job = jobStore.getJob(jobId);
  const processingTime = job ? endTime - job.startTime : 0;
  
  // 결과를 job에 저장
  jobStore.updateJob(jobId, {
    status: 'completed',
    endTime,
    results, // 결과 데이터 저장
  } as any);
  
  // 결과 파일 저장
  try {
    await saveResults(jobId, results, processingTime);
    console.log(`✅ Results saved successfully for job ${jobId}`);
  } catch (error) {
    console.error('❌ Failed to save results:', error);
  }
  
  return results;
}

/**
 * 결과 파일 저장
 */
async function saveResults(
  jobId: string,
  results: ProcessedAddress[],
  processingTime: number
): Promise<void> {
  const { writeFile, mkdir } = await import('fs/promises');
  const { join } = await import('path');
  const { OUTPUT_DIR } = await import('@/lib/utils/file-storage');
  const { generateMarkdownReport, generateReportFileName } = await import('@/lib/report/markdown');
  const { generateAddressCountCSV } = await import('@/lib/agg/address');
  
  // OUTPUT_DIR 존재 확인 및 생성
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Output directory ready: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('Failed to create output directory:', error);
    throw error;
  }
  
  // 1. 성공한 결과 CSV
  const successResults = results.filter((r) => r.status === 'success');
  const successCSV = [
    '원본주소,정규화된주소,위도,경도,신뢰도,도로명주소,지번주소',
    ...successResults.map((r) =>
      [
        `"${r.originalAddress}"`,
        `"${r.normalizedAddress}"`,
        r.lat,
        r.lng,
        r.confidence,
        `"${r.geocodeResponse?.roadAddress || ''}"`,
        `"${r.geocodeResponse?.jibunAddress || ''}"`,
      ].join(',')
    ),
  ].join('\n');
  
  const resultsPath = join(OUTPUT_DIR, `results_${jobId}.csv`);
  await writeFile(resultsPath, successCSV, 'utf-8');
  console.log(`✅ Saved results CSV: ${resultsPath}`);
  
  // 2. 에러 CSV
  const errorResults = results.filter((r) => r.status === 'failed');
  if (errorResults.length > 0) {
    const errorCSV = [
      '원본주소,에러메시지',
      ...errorResults.map((r) => `"${r.originalAddress}","${r.error || '알 수 없음'}"`),
    ].join('\n');
    
    const errorsPath = join(OUTPUT_DIR, `errors_${jobId}.csv`);
    await writeFile(errorsPath, errorCSV, 'utf-8');
    console.log(`✅ Saved errors CSV: ${errorsPath}`);
  }
  
  // 3. Markdown 리포트
  const reportData = {
    jobId,
    fileName: `processed_${jobId}`,
    processedAt: new Date(),
    results,
    totalCount: results.length,
    successCount: successResults.length,
    failedCount: errorResults.length,
    processingTime,
  };
  
  const markdownContent = generateMarkdownReport(reportData, {
    topN: parseInt(process.env.DEFAULT_TOP_N || '20', 10),
    includeMap: true,
    includeErrors: true,
  });
  
  const reportFileName = generateReportFileName(jobId);
  const reportPath = join(OUTPUT_DIR, reportFileName);
  await writeFile(reportPath, markdownContent, 'utf-8');
  console.log(`✅ Saved markdown report: ${reportPath}`);
  
  console.log(`📦 All results saved for job ${jobId}:
    - Results CSV: results_${jobId}.csv
    - Errors CSV: errors_${jobId}.csv (${errorResults.length} errors)
    - Report: ${reportFileName}
  `);
}

/**
 * 중복 주소 사전 제거
 * API 호출 최적화
 */
export function deduplicateForProcessing(
  addresses: string[]
): {
  unique: string[];
  indexMap: Map<string, number[]>; // 정규화된 주소 → 원본 인덱스들
} {
  const indexMap = new Map<string, number[]>();
  const seen = new Set<string>();
  const unique: string[] = [];
  
  addresses.forEach((addr, index) => {
    const normalized = normalizeAddress(addr).normalized;
    
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(addr);
    }
    
    const indices = indexMap.get(normalized) || [];
    indices.push(index);
    indexMap.set(normalized, indices);
  });
  
  return { unique, indexMap };
}

