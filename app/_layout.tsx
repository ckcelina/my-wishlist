
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
import { SmartLocationProvider } from '@/contexts/SmartLocationContext';
import { logConfiguration } from '@/utils/environmentConfig';
import { runParityVerification } from '@/utils/parityVerification';
import { trackAppVersion } from '@/utils/versionTracking';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
    // Log environment configuration on app start
    console.log('═══════════════════════════════════════════════════');
    console.log('🚀 APP STARTING - PRODUCTION PARITY ENFORCED');
    console.log('═══════════════════════════════════════════════════');
    
    logConfiguration();
    
    // Run parity verification
    runParityVerification().then(report => {
      if (!report.overallPassed) {
        console.error('🚨 PARITY VERIFICATION FAILED - REVIEW CONFIGURATION');
      }
    });
    
    // Track app version
    trackAppVersion().catch(error => {
      console.error('[App] Failed to track app version:', error);
    });
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppThemeProvider>
          <I18nProvider>
            <SmartLocationProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </SmartLocationProvider>
          </I18nProvider>
        </AppThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
