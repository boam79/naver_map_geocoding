/**
 * Job 상태 관리 스토어
 * HMR 문제 해결: global 객체에 저장
 */

import { JobProgress, CheckpointInfo } from './types';

class JobStore {
  private jobs = new Map<string, JobProgress>();

  getJob(jobId: string): JobProgress | undefined {
    return this.jobs.get(jobId);
  }

  createJob(jobId: string, totalCount: number): void {
    this.jobs.set(jobId, {
      jobId,
      status: 'pending',
      totalCount,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      startTime: Date.now(),
      checkpoints: [],
    });
  }

  updateJob(jobId: string, update: Partial<JobProgress>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, update);
      this.jobs.set(jobId, job);
    }
  }

  addCheckpoint(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      const checkpoint: CheckpointInfo = {
        timestamp: Date.now(),
        processedCount: job.processedCount,
        successCount: job.successCount,
        failedCount: job.failedCount,
      };
      
      job.checkpoints.push(checkpoint);
      this.jobs.set(jobId, job);
    }
  }

  deleteJob(jobId: string): void {
    this.jobs.delete(jobId);
  }
  
  getAllJobs(): string[] {
    return Array.from(this.jobs.keys());
  }
}

// HMR 대응: global 객체에 저장하여 재시작 시에도 유지
declare global {
  var __jobStore: JobStore | undefined;
}

export const jobStore = global.__jobStore ?? new JobStore();

if (process.env.NODE_ENV !== 'production') {
  global.__jobStore = jobStore;
}