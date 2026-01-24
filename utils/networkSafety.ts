
import { BACKEND_URL } from './api';
import { logError, logEvent } from './observability';

export interface PartialResultEnvelope<T> {
  data: T | null;
  error: string | null;
  meta?: {
    requestId?: string;
    confidence?: number;
    partial?: boolean;
    retryCount?: number;
    timestamp?: string;
  };
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeoutMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 5000,
  timeoutMs: 30000,
};

function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(2, attempt),
    config.maxDelay
  );
  const jitter = Math.random() * 0.3 * delay;
  return delay + jitter;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

export async function safeEdgeFunctionCall<T>(
  functionName: string,
  payload: any,
  token: string | null,
  config: Partial<RetryConfig> = {}
): Promise<PartialResultEnvelope<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  
  const requestId = `${functionName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[NetworkSafety] Starting ${functionName} (requestId: ${requestId})`);

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateBackoffDelay(attempt - 1, finalConfig);
        console.log(`[NetworkSafety] Retry ${attempt}/${finalConfig.maxRetries} after ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const url = `${BACKEND_URL}/api/${functionName}`;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        },
        finalConfig.timeoutMs
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      console.log(`[NetworkSafety] ${functionName} succeeded on attempt ${attempt + 1}`);
      
      logEvent(`ai_${functionName}_success`, {
        requestId,
        attempt: attempt + 1,
        confidence: result.confidence,
      });

      return {
        data: result,
        error: null,
        meta: {
          requestId,
          confidence: result.confidence,
          partial: false,
          retryCount: attempt,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[NetworkSafety] ${functionName} attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt === finalConfig.maxRetries) {
        logError(lastError, {
          context: `${functionName}_failed`,
          requestId,
          attempts: attempt + 1,
          payload,
        });
        
        logEvent(`ai_${functionName}_failed`, {
          requestId,
          error: lastError.message,
          attempts: attempt + 1,
        });
      }
    }
  }

  const errorMessage = lastError?.message || 'Unknown error';
  const userFriendlyMessage = getUserFriendlyErrorMessage(errorMessage);

  return {
    data: null,
    error: userFriendlyMessage,
    meta: {
      requestId,
      retryCount: finalConfig.maxRetries,
      timestamp: new Date().toISOString(),
    },
  };
}

function getUserFriendlyErrorMessage(error: string): string {
  if (error.includes('timeout') || error.includes('Request timeout')) {
    return 'The request took too long. Please try again.';
  }
  if (error.includes('Network request failed') || error.includes('Failed to fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (error.includes('HTTP 401') || error.includes('HTTP 403')) {
    return 'Authentication error. Please sign in again.';
  }
  if (error.includes('HTTP 429')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (error.includes('HTTP 500') || error.includes('HTTP 502') || error.includes('HTTP 503')) {
    return 'Server error. Please try again in a moment.';
  }
  return 'Something went wrong. Please try again.';
}

export function getConfidenceLevel(confidence: number | undefined): 'high' | 'medium' | 'low' {
  if (!confidence) return 'low';
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

export function getConfidenceLabel(confidence: number | undefined): string {
  const level = getConfidenceLevel(confidence);
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function getConfidenceColor(confidence: number | undefined): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high':
      return '#10b981';
    case 'medium':
      return '#f59e0b';
    case 'low':
      return '#ef4444';
  }
}
