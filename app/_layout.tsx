
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider as AppThemeProvider } from '@/contexts/ThemeContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { SmartLocationProvider } from '@/contexts/SmartLocationContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { runParityVerification } from '@/utils/parityVerification';
import { trackAppVersion } from '@/utils/versionTracking';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { validateEnv, logEnvironmentConfig, getConfigurationErrorMessage } from '@/src/config/env';
import { ConfigurationError } from '@/components/design-system/ConfigurationError';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [envErrors, setEnvErrors] = useState<string[]>([]);
  const [envChecked, setEnvChecked] = useState(false);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Log environment configuration on app start
    console.log('═══════════════════════════════════════════════════');
    console.log('🚀 APP STARTING - SUPABASE EDGE FUNCTIONS');
    console.log('═══════════════════════════════════════════════════');
    
    // Validate environment configuration (from src/config/env.ts)
    const missingKeys = validateEnv();
    if (missingKeys.length > 0) {
      console.error('❌ ENVIRONMENT CONFIGURATION ERROR:');
      missingKeys.forEach(key => console.error(`  • ${key}`));
      console.error('❌ App cannot start without required configuration');
      setEnvErrors(missingKeys);
    } else {
      console.log('✅ Environment configuration validated successfully');
    }
    
    setEnvChecked(true);
    
    // Log full environment config
    logEnvironmentConfig();
    
    // Run parity verification
    runParityVerification().then(report => {
      if (!report.overallPassed) {
        console.error('🚨 PARITY VERIFICATION FAILED - REVIEW CONFIGURATION');
      }
    });
    
    // Track app version (idempotent, cross-platform, never throws)
    trackAppVersion();
  }, []);

  if (!loaded || !envChecked) {
    return null;
  }

  // Show configuration error screen if environment is not configured
  if (envErrors.length > 0 && __DEV__) {
    return (
      <ConfigurationError 
        missingKeys={envErrors} 
        onRetry={() => {
          const missingKeys = validateEnv();
          setEnvErrors(missingKeys);
        }} 
      />
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppThemeProvider>
          <WidgetProvider>
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
          </WidgetProvider>
        </AppThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
