
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider as AppThemeProvider } from '@/contexts/ThemeContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { verifySupabaseConnection, getSupabaseConfig } from '@/utils/supabase-connection';
import { SUPABASE_CONNECTION_STATUS } from '@/lib/supabase';

// Prevent the splash screen from auto-hiding before asset loading is complete.
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

  useEffect(() => {
    // Verify Supabase connection on app start
    console.log('[App] ═══════════════════════════════════════════════════');
    console.log('[App] 🚀 MY WISHLIST APP STARTING');
    console.log('[App] ═══════════════════════════════════════════════════');
    console.log('[App] Verifying Supabase connection...');
    
    const config = getSupabaseConfig();
    console.log('[App] Supabase Config:', config);
    console.log('[App] Supabase Connection Status:', SUPABASE_CONNECTION_STATUS);
    
    verifySupabaseConnection().then((status) => {
      console.log('[App] ═══════════════════════════════════════════════════');
      if (status.connected) {
        console.log('[App] ✅ SUPABASE CONNECTION VERIFIED SUCCESSFULLY');
        console.log('[App] ═══════════════════════════════════════════════════');
        console.log('[App] - URL:', status.url);
        console.log('[App] - Auth configured:', status.authConfigured);
        console.log('[App] - Database accessible:', status.databaseAccessible);
        console.log('[App] - Anon key configured:', status.hasAnonKey);
        console.log('[App] ═══════════════════════════════════════════════════');
        console.log('[App] 🎉 NATIVELY + SUPABASE INTEGRATION ACTIVE');
        console.log('[App] ═══════════════════════════════════════════════════');
      } else {
        console.error('[App] ❌ Supabase connection failed:', status.error);
      }
    });
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <AuthProvider>
          <I18nProvider>
            <WidgetProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </WidgetProvider>
          </I18nProvider>
        </AuthProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
