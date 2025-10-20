/**
 * 배치 처리 API
 * POST /api/process
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { parseFile } from '@/lib/excel';
import { jobStore } from '@/lib/batch/job-store';
import { calculateDataStatistics } from '@/lib/validation';
import { UPLOAD_DIR } from '@/lib/utils/file-storage';

// Job ID 생성
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, sheetIndex = 0, addressColumn } = body;
    
    if (!fileName) {
      return NextResponse.json(
        { success: false, error: 'fileName is required' },
        { status: 400 }
      );
    }
    
    if (!addressColumn) {
      return NextResponse.json(
        { success: false, error: 'addressColumn is required' },
        { status: 400 }
      );
    }
    
    // 1. 파일 읽기
    const filePath = join(UPLOAD_DIR, fileName);
    
    try {
      const buffer = await readFile(filePath);
      
      // 2. 엑셀 파싱
      const parseResult = await parseFile(buffer, {
        sheetIndex,
        skipEmptyRows: true,
        trimValues: true,
        maxRows: 10000,
      });
      
      if (!parseResult.success || !parseResult.data) {
        return NextResponse.json(
          {
            success: false,
            error: parseResult.error || '파일 파싱에 실패했습니다.',
          },
          { status: 400 }
        );
      }
      
      const { headers, rows } = parseResult.data;
      
      // 3. 주소 컬럼 존재 확인
      if (!headers.includes(addressColumn)) {
        return NextResponse.json(
          {
            success: false,
            error: `주소 컬럼 '${addressColumn}'을 찾을 수 없습니다.`,
            availableColumns: headers,
          },
          { status: 400 }
        );
      }
      
      // 4. 데이터 통계 계산 (간단한 버전)
      const statistics = {
        totalRows: rows.length,
        emptyRows: rows.filter(row => !row[addressColumn] || row[addressColumn].toString().trim() === '').length,
        uniqueAddresses: new Set(rows.map(row => row[addressColumn]?.toString().trim()).filter(Boolean)).size,
      };
      
      // 5. Job 생성
      const jobId = generateJobId();
      jobStore.createJob(jobId, rows.length);
      console.log(`✅ Job created: ${jobId}, totalCount: ${rows.length}`);
      
      // 6. 백그라운드 처리 시작 (비동기) - 실제 지오코딩 사용
      processAddressesWithGeocoding(jobId, rows, addressColumn).catch((error) => {
        console.error(`❌ Job ${jobId} failed:`, error);
        jobStore.updateJob(jobId, {
          status: 'failed',
          error: error.message,
          endTime: Date.now(),
        });
      });
      
      // 7. 즉시 응답 (작업 ID 반환)
      return NextResponse.json({
        success: true,
        data: {
          jobId,
          totalCount: rows.length,
          addressColumn,
          statistics,
          message: '처리가 시작되었습니다. /api/status/{jobId}에서 진행 상황을 확인하세요.',
        },
      });
    } catch (fileError) {
      console.error('File read error:', fileError);
      return NextResponse.json(
        {
          success: false,
          error: '파일을 읽을 수 없습니다. 파일이 존재하는지 확인해주세요.',
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Process API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

/**
 * 백그라운드 주소 처리 - 실제 지오코딩 사용
 */
async function processAddressesWithGeocoding(
  jobId: string,
  rows: Record<string, any>[],
  addressColumn: string
): Promise<void> {
  console.log(`🚀 Starting real geocoding for job ${jobId}`);
  
  // 주소 추출
  const addresses = rows
    .map(row => row[addressColumn]?.toString().trim())
    .filter(Boolean);
  
  // 실제 배치 처리 서비스 사용
  const { processBatch } = await import('@/lib/batch/service');
  
  const checkpointInterval = parseInt(process.env.CHECKPOINT_INTERVAL || '100', 10);
  
  try {
    const results = await processBatch({
      jobId,
      addresses,
      checkpointInterval,
      onProgress: (processed, total) => {
        // 진행률 업데이트는 processBatch 내부에서 처리됨
      },
    });
    
    console.log(`✅ Geocoding completed for job ${jobId}: ${results.filter(r => r.success).length}/${results.length} successful`);
  } catch (error) {
    console.error(`❌ Geocoding failed for job ${jobId}:`, error);
    throw error;
  }
}