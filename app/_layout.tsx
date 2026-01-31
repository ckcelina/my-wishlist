
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
import { LocationProvider } from '@/contexts/LocationContext';
import { logConfiguration, checkAPIConnectivity } from '@/utils/environmentConfig';
import { runParityVerification } from '@/utils/parityVerification';
import { trackAppVersion } from '@/utils/versionTracking';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { validateEnv, logEnvironmentConfig } from '@/src/config/env';
import { preloadLocalCities } from '@/src/services/citySearch';

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
    
    // Validate environment configuration (from src/config/env.ts)
    const envValidationError = validateEnv();
    if (envValidationError) {
      console.error('❌ ENVIRONMENT CONFIGURATION ERROR:');
      console.error(envValidationError);
      console.error('❌ Some features may not work correctly');
    } else {
      console.log('✅ Environment configuration validated successfully');
    }
    
    logConfiguration();
    
    // Preload local cities dataset for fallback search
    preloadLocalCities().then(() => {
      console.log('✅ Local cities dataset preloaded');
    }).catch(error => {
      console.error('❌ Failed to preload local cities:', error);
    });
    
    // Run parity verification
    runParityVerification().then(report => {
      if (!report.overallPassed) {
        console.error('🚨 PARITY VERIFICATION FAILED - REVIEW CONFIGURATION');
      }
    });
    
    // Check API connectivity
    checkAPIConnectivity().then(result => {
      if (result.connected) {
        console.log('✅ Backend API is reachable');
      } else {
        console.warn('⚠️ Backend API connectivity issue:', result.error);
        console.warn('⚠️ Some features may not work correctly');
      }
    });
    
    // Track app version (idempotent, cross-platform, never throws)
    trackAppVersion();
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
              <LocationProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="auth" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
              </LocationProvider>
            </SmartLocationProvider>
          </I18nProvider>
        </AppThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
