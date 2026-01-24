
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'wishzen_cache_';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      console.log('[Cache] Expired cache for:', key);
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }
    
    console.log('[Cache] Hit for:', key);
    return entry.data;
  } catch (error) {
    console.error('[Cache] Error reading cache:', error);
    return null;
  }
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
    console.log('[Cache] Stored cache for:', key);
  } catch (error) {
    console.error('[Cache] Error writing cache:', error);
  }
}

export async function clearCache(key?: string): Promise<void> {
  try {
    if (key) {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      await AsyncStorage.removeItem(cacheKey);
      console.log('[Cache] Cleared cache for:', key);
    } else {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('[Cache] Cleared all cache');
    }
  } catch (error) {
    console.error('[Cache] Error clearing cache:', error);
  }
}
