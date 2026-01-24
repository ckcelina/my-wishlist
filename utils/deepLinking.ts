
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_ROUTE_KEY = 'wishzen_pending_route';

export interface PendingRoute {
  path: string;
  params?: Record<string, string>;
}

export async function storePendingRoute(route: PendingRoute): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_ROUTE_KEY, JSON.stringify(route));
    console.log('[DeepLink] Stored pending route:', route.path);
  } catch (error) {
    console.error('[DeepLink] Error storing pending route:', error);
  }
}

export async function getPendingRoute(): Promise<PendingRoute | null> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_ROUTE_KEY);
    if (!stored) {
      return null;
    }
    
    const route: PendingRoute = JSON.parse(stored);
    console.log('[DeepLink] Retrieved pending route:', route.path);
    return route;
  } catch (error) {
    console.error('[DeepLink] Error retrieving pending route:', error);
    return null;
  }
}

export async function clearPendingRoute(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_ROUTE_KEY);
    console.log('[DeepLink] Cleared pending route');
  } catch (error) {
    console.error('[DeepLink] Error clearing pending route:', error);
  }
}

export function parseDeepLink(url: string): PendingRoute | null {
  try {
    const parsed = Linking.parse(url);
    console.log('[DeepLink] Parsed URL:', parsed);
    
    // Handle share links: mywishlist://share/:shareSlug
    if (parsed.path?.startsWith('share/')) {
      const shareSlug = parsed.path.replace('share/', '');
      return {
        path: `/shared/${shareSlug}`,
      };
    }
    
    // Handle import links: mywishlist://import?url=:wishlistUrl
    if (parsed.path === 'import' && parsed.queryParams?.url) {
      return {
        path: '/import-preview',
        params: {
          wishlistUrl: parsed.queryParams.url as string,
        },
      };
    }
    
    // Handle add item links: mywishlist://add?url=:productUrl
    if (parsed.path === 'add' && parsed.queryParams?.url) {
      return {
        path: '/(tabs)/add',
        params: {
          sharedUrl: parsed.queryParams.url as string,
        },
      };
    }
    
    console.log('[DeepLink] No matching route for:', url);
    return null;
  } catch (error) {
    console.error('[DeepLink] Error parsing deep link:', error);
    return null;
  }
}
