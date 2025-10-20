/**
 * 지도 뷰어용 좌표 데이터 API
 * GET /api/viewer/points?jobId={jobId}
 */

import { NextRequest, NextResponse } from 'next/server';
import { jobStore } from '@/lib/batch/job-store';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId is required' },
        { status: 400 }
      );
    }
    
    // jobStore에서 결과 가져오기
    const job = jobStore.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (job.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: `Job is ${job.status}. Wait for completion.` },
        { status: 400 }
      );
    }
    
    // results 데이터 가져오기
    const results = (job as any).results || [];
    
    const points = results
      .filter((r: any) => r.success && r.lat && r.lng)
      .map((r: any) => ({
        lat: r.lat,
        lng: r.lng,
        address: r.address,
      }));
    
    console.log(`📍 Returning ${points.length} points for job ${jobId}`);
    
    return NextResponse.json({
      success: true,
      data: {
        points,
        count: points.length,
        jobId,
      },
    });
  } catch (error) {
    console.error('Viewer points API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load points',
      },
      { status: 500 }
    );
  }
}

