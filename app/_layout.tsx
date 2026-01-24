
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { verifySupabaseConnection, getSupabaseConfig } from '@/utils/supabase-connection';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Verify Supabase connection on app startup
  useEffect(() => {
    const checkConnection = async () => {
      console.log('[App] Verifying Supabase connection...');
      
      const config = getSupabaseConfig();
      console.log('[App] Supabase Config:', config);
      
      const status = await verifySupabaseConnection();
      
      if (status.connected) {
        console.log('[App] ✅ Supabase connection verified successfully');
        console.log('[App] - URL:', status.url);
        console.log('[App] - Auth configured:', status.authConfigured);
        console.log('[App] - Database accessible:', status.databaseAccessible);
      } else {
        console.error('[App] ❌ Supabase connection failed:', status.error);
        console.error('[App] - URL:', status.url);
        console.error('[App] - Has anon key:', status.hasAnonKey);
        console.error('[App] - Auth configured:', status.authConfigured);
        console.error('[App] - Database accessible:', status.databaseAccessible);
      }
    };
    
    checkConnection();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <AuthProvider>
            <I18nProvider>
              <WidgetProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="auth" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                  <Stack.Screen name="wishlist/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="item/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="item/edit/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="item/price-history/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="shared/[shareSlug]" options={{ headerShown: false }} />
                  <Stack.Screen name="import-wishlist" options={{ headerShown: false }} />
                  <Stack.Screen name="import-preview" options={{ headerShown: false }} />
                  <Stack.Screen name="import-summary" options={{ headerShown: false }} />
                  <Stack.Screen name="confirm-product" options={{ headerShown: false }} />
                  <Stack.Screen name="location" options={{ headerShown: false }} />
                  <Stack.Screen name="alerts" options={{ headerShown: false }} />
                  <Stack.Screen name="quiet-hours" options={{ headerShown: false }} />
                  <Stack.Screen name="on-sale" options={{ headerShown: false }} />
                  <Stack.Screen name="global-search" options={{ headerShown: false }} />
                  <Stack.Screen name="export-data" options={{ headerShown: false }} />
                  <Stack.Screen name="diagnostics" options={{ headerShown: false }} />
                  <Stack.Screen name="language-selector" options={{ headerShown: false }} />
                  <Stack.Screen name="premium-info" options={{ headerShown: false }} />
                  <Stack.Screen name="report-problem" options={{ headerShown: false }} />
                  <Stack.Screen name="legal/privacy" options={{ headerShown: false }} />
                  <Stack.Screen name="legal/terms" options={{ headerShown: false }} />
                  <Stack.Screen name="permissions/camera" options={{ headerShown: false }} />
                  <Stack.Screen name="permissions/photos" options={{ headerShown: false }} />
                  <Stack.Screen name="permissions/notifications" options={{ headerShown: false }} />
                </Stack>
              </WidgetProvider>
            </I18nProvider>
          </AuthProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
