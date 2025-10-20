/**
 * Job 상태 조회 API (Polling)
 * GET /api/status/[jobId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { jobStore } from '@/lib/batch/job-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
    console.log(`📊 Status API called for jobId: ${jobId}`);
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId is required' },
        { status: 400 }
      );
    }

    const job = jobStore.getJob(jobId);
    
    console.log(`📊 Job found:`, job ? 'YES' : 'NO', job ? `status: ${job.status}` : '');
    
    if (!job) {
      // 모든 job 목록 출력
      const allJobs = (jobStore as any).jobs || {};
      console.log(`📊 All jobs in store:`, Object.keys(allJobs));
      
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // 진행률 계산
    const progressPercent = job.totalCount > 0 
      ? Math.round((job.processedCount / job.totalCount) * 100)
      : 0;

    // 처리 속도 계산
    const elapsedTime = (Date.now() - job.startTime) / 1000; // 초
    const processingSpeed = elapsedTime > 0 ? job.processedCount / elapsedTime : 0;

    // 예상 남은 시간 계산
    const remainingItems = job.totalCount - job.processedCount;
    const estimatedTimeRemaining = processingSpeed > 0 
      ? remainingItems / processingSpeed 
      : undefined;

    const progressData = {
      success: true,
      jobId,
      status: job.status,
      totalCount: job.totalCount,
      processedCount: job.processedCount,
      successCount: job.successCount,
      failedCount: job.failedCount,
      skippedCount: job.skippedCount,
      progressPercent,
      processingSpeed,
      estimatedTimeRemaining,
      currentAddress: job.currentAddress,
      startTime: job.startTime,
      endTime: job.endTime,
      error: job.error,
    };

    return NextResponse.json(progressData);
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}