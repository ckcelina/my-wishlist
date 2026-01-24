
import { logEvent, logError } from './observability';

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  '_ga',
  '_gid',
  'ref',
  'source',
  'campaign',
  'msclkid',
  'igshid',
];

const SHORTENED_DOMAINS = [
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'buff.ly',
  'amzn.to',
  'amzn.com',
];

export async function normalizeUrl(url: string): Promise<string> {
  console.log('[UrlNormalization] Normalizing URL:', url);
  
  try {
    let normalizedUrl = url.trim();
    
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    const urlObj = new URL(normalizedUrl);
    
    TRACKING_PARAMS.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    const sortedParams = new URLSearchParams();
    const paramKeys = Array.from(urlObj.searchParams.keys()).sort();
    paramKeys.forEach(key => {
      const value = urlObj.searchParams.get(key);
      if (value) {
        sortedParams.set(key, value);
      }
    });
    urlObj.search = sortedParams.toString();
    
    let hostname = urlObj.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    urlObj.hostname = hostname;
    
    let pathname = urlObj.pathname;
    if (pathname.endsWith('/') && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }
    urlObj.pathname = pathname;
    
    const isShortened = SHORTENED_DOMAINS.some(domain => hostname.includes(domain));
    if (isShortened) {
      console.log('[UrlNormalization] Detected shortened URL, attempting to expand');
      try {
        const expanded = await expandShortenedUrl(urlObj.toString());
        if (expanded && expanded !== urlObj.toString()) {
          console.log('[UrlNormalization] Expanded URL:', expanded);
          return normalizeUrl(expanded);
        }
      } catch (error) {
        console.warn('[UrlNormalization] Failed to expand shortened URL:', error);
      }
    }
    
    const result = urlObj.toString();
    console.log('[UrlNormalization] Normalized URL:', result);
    
    logEvent('url_normalized', {
      original: url,
      normalized: result,
      removed_params: TRACKING_PARAMS.filter(p => url.includes(p)),
    });
    
    return result;
  } catch (error) {
    console.error('[UrlNormalization] Failed to normalize URL:', error);
    logError(error instanceof Error ? error : new Error(String(error)), {
      context: 'normalizeUrl',
      url,
    });
    return url;
  }
}

async function expandShortenedUrl(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.url && response.url !== url) {
      console.log('[UrlNormalization] Expanded shortened URL:', response.url);
      return response.url;
    }
    
    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[UrlNormalization] URL expansion timed out');
    } else {
      console.warn('[UrlNormalization] URL expansion failed:', error);
    }
    
    return null;
  }
}

export function compareNormalizedUrls(url1: string, url2: string): boolean {
  try {
    const normalized1 = new URL(url1);
    const normalized2 = new URL(url2);
    
    const host1 = normalized1.hostname.toLowerCase().replace(/^www\./, '');
    const host2 = normalized2.hostname.toLowerCase().replace(/^www\./, '');
    
    const path1 = normalized1.pathname.replace(/\/$/, '');
    const path2 = normalized2.pathname.replace(/\/$/, '');
    
    return host1 === host2 && path1 === path2;
  } catch (error) {
    console.error('[UrlNormalization] Failed to compare URLs:', error);
    return url1 === url2;
  }
}
