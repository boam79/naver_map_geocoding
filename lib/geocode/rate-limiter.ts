/**
 * Rate Limiter
 * API 호출 제한 관리
 */

export class RateLimiter {
  private queue: Array<() => void> = [];
  private activeCount = 0;
  private maxConcurrency: number;
  private requestsPerSecond: number;
  private lastRequestTime = 0;
  private minInterval: number; // 최소 요청 간격 (ms)
  
  constructor(requestsPerSecond: number = 10, maxConcurrency: number = 5) {
    this.requestsPerSecond = requestsPerSecond;
    this.maxConcurrency = maxConcurrency;
    this.minInterval = 1000 / requestsPerSecond; // ms
  }
  
  /**
   * 요청 승인 대기
   */
  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        // 동시 요청 수 제한 확인
        if (this.activeCount >= this.maxConcurrency) {
          this.queue.push(tryAcquire);
          return;
        }
        
        // Rate limit 확인 (초당 요청 수)
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.minInterval) {
          // 대기 필요
          const delay = this.minInterval - timeSinceLastRequest;
          setTimeout(tryAcquire, delay);
          return;
        }
        
        // 승인
        this.activeCount++;
        this.lastRequestTime = now;
        resolve();
      };
      
      tryAcquire();
    });
  }
  
  /**
   * 요청 완료 (슬롯 해제)
   */
  release(): void {
    this.activeCount--;
    
    // 대기 중인 요청 처리
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        // 비동기로 처리
        setTimeout(next, 0);
      }
    }
  }
  
  /**
   * 대기 중인 요청 수
   */
  getQueueSize(): number {
    return this.queue.length;
  }
  
  /**
   * 현재 활성 요청 수
   */
  getActiveCount(): number {
    return this.activeCount;
  }
}

