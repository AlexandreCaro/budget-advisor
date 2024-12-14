class RateLimiter {
  private queue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    fn: () => Promise<any>;
    category?: string;
    requestId?: string;
  }> = [];
  private processing = false;
  private lastRequestTime = 0;
  private readonly minDelay = 2000; // 2 seconds between requests
  private readonly maxConcurrent = 2;
  private activeRequests = 0;
  private readonly maxRetries = 5;
  private readonly baseDelay = 2000;
  private readonly maxDelay = 30000;

  async schedule<T>(fn: () => Promise<T>, category?: string): Promise<T> {
    const requestId = Math.random().toString(36).substring(7);
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, fn, category, requestId });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.minDelay) {
        const waitTime = this.minDelay - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const request = this.queue.shift();
      if (!request) continue;

      let retryCount = 0;

      while (retryCount < this.maxRetries) {
        try {
          this.activeRequests++;
          this.lastRequestTime = Date.now();

          const result = await request.fn();
          request.resolve(result);
          break;
        } catch (error) {
          retryCount++;
          
          const isRetryableError = (err: unknown): boolean => {
            if (err instanceof TypeError) return true;
            if (err instanceof Error) {
              if (err.name === 'AbortError') return true;
              if (err.message && err.message.includes('429')) return true;
            }
            return false;
          };

          if (isRetryableError(error) && retryCount < this.maxRetries) {
            const delay = Math.min(this.baseDelay * Math.pow(2, retryCount), this.maxDelay);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          request.reject(error);
          break;
        } finally {
          this.activeRequests--;
        }
      }
    }

    this.processing = false;
  }
}

export const rateLimiter = new RateLimiter(); 