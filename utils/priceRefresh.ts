
import { authenticatedPost, authenticatedGet } from './api';
import { logEvent, logError } from './observability';

export interface PriceRefreshJob {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  totalItems: number;
  processedItems: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
}

export async function createPriceRefreshJob(wishlistId?: string): Promise<PriceRefreshJob> {
  console.log('[PriceRefresh] Creating price refresh job, wishlistId:', wishlistId);
  
  try {
    logEvent('price_refresh_job_created', { wishlistId });
    
    const job = await authenticatedPost<PriceRefreshJob>('/api/price-refresh/create', {
      wishlistId,
    });
    
    console.log('[PriceRefresh] Job created:', job);
    return job;
  } catch (error) {
    console.error('[PriceRefresh] Failed to create job:', error);
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'createPriceRefreshJob',
      wishlistId,
    });
    throw error;
  }
}

export async function getPriceRefreshJobStatus(jobId: string): Promise<PriceRefreshJob> {
  console.log('[PriceRefresh] Getting job status:', jobId);
  
  try {
    const job = await authenticatedGet<PriceRefreshJob>(`/api/price-refresh/status/${jobId}`);
    console.log('[PriceRefresh] Job status:', job);
    return job;
  } catch (error) {
    console.error('[PriceRefresh] Failed to get job status:', error);
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'getPriceRefreshJobStatus',
      jobId,
    });
    throw error;
  }
}

export async function processPriceRefreshJob(jobId: string): Promise<{ success: boolean; processedItems: number; failedItems: number }> {
  console.log('[PriceRefresh] Processing job:', jobId);
  
  try {
    const result = await authenticatedPost<{ success: boolean; processedItems: number; failedItems: number }>(
      `/api/price-refresh/process/${jobId}`,
      {}
    );
    
    console.log('[PriceRefresh] Job processed:', result);
    return result;
  } catch (error) {
    console.error('[PriceRefresh] Failed to process job:', error);
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'processPriceRefreshJob',
      jobId,
    });
    throw error;
  }
}

export async function retryPriceRefreshJob(jobId: string): Promise<PriceRefreshJob> {
  console.log('[PriceRefresh] Retrying job:', jobId);
  
  try {
    const job = await authenticatedPost<PriceRefreshJob>(`/api/price-refresh/retry/${jobId}`, {});
    console.log('[PriceRefresh] Job retried:', job);
    return job;
  } catch (error) {
    console.error('[PriceRefresh] Failed to retry job:', error);
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'retryPriceRefreshJob',
      jobId,
    });
    throw error;
  }
}

export async function pollPriceRefreshJob(
  jobId: string,
  onProgress?: (job: PriceRefreshJob) => void,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<PriceRefreshJob> {
  console.log('[PriceRefresh] Starting to poll job:', jobId);
  
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const job = await getPriceRefreshJobStatus(jobId);
      
      if (onProgress) {
        onProgress(job);
      }
      
      if (job.status === 'done') {
        console.log('[PriceRefresh] Job completed successfully');
        logEvent('price_refresh_job_completed', { jobId, totalItems: job.totalItems });
        return job;
      }
      
      if (job.status === 'failed') {
        console.error('[PriceRefresh] Job failed:', job.errorMessage);
        logEvent('price_refresh_job_failed', { jobId, error: job.errorMessage });
        throw new Error(job.errorMessage || 'Price refresh job failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    } catch (error) {
      console.error('[PriceRefresh] Error polling job:', error);
      throw error;
    }
  }
  
  throw new Error('Price refresh job timed out');
}

export function getPriceRefreshProgress(job: PriceRefreshJob): number {
  if (job.totalItems === 0) return 0;
  return (job.processedItems / job.totalItems) * 100;
}

export function getPriceRefreshStatusText(job: PriceRefreshJob): string {
  const statusTexts = {
    queued: 'Queued',
    running: `Refreshing… ${job.processedItems}/${job.totalItems} items`,
    done: 'Done',
    failed: 'Failed',
  };
  
  return statusTexts[job.status];
}
