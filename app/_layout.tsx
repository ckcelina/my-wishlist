
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/contexts/ThemeContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { SmartLocationProvider } from '@/contexts/SmartLocationContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { runParityVerification } from '@/utils/parityVerification';
import { trackAppVersion } from '@/utils/versionTracking';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { verifyConfiguration, logConfiguration, getConfigurationErrorMessage } from '@/utils/environmentConfig';
import { ConfigurationError } from '@/components/design-system/ConfigurationError';
import { createColors } from '@/styles/designSystem';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { theme, isDark } = useAppTheme();
  const colors = createColors(theme);

  useEffect(() => {
    if (loading) {
      console.log('[RootLayout] Auth loading, waiting...');
      return;
    }

    const inAuthGroup = segments[0] === '(tabs)';
    
    // Allowlist for Add Item flow routes - these should NOT be redirected
    const allowedRoutes = [
      'import-preview',
      'permissions',
      'import-wishlist',
      'smart-search',
      'wishlist',
      'item',
      'shared',
      'auth-callback',
      'location',
      'alerts',
      'diagnostics',
      'diagnostics-enhanced',
      'e2e-test',
      'language-selector',
      'permissions-settings',
      'legal',
    ];
    
    const isAllowedRoute = allowedRoutes.some(route => segments[0] === route);

    console.log('[RootLayout] Navigation guard:', {
      user: user?.id || 'none',
      loading,
      inAuthGroup,
      segments,
      isAllowedRoute,
    });

    if (!user && inAuthGroup) {
      // User is not signed in and trying to access protected routes
      console.log('[RootLayout] Redirecting to /auth');
      router.replace('/auth');
    } else if (user && !inAuthGroup && !isAllowedRoute) {
      // User is signed in but not in protected routes (and not in allowed routes)
      console.log('[RootLayout] Redirecting to /(tabs)/lists');
      router.replace('/(tabs)/lists');
    }
  }, [user, loading, segments, router]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            color: colors.text,
            fontWeight: '600',
          },
          headerBackTitleVisible: false,
          headerBackTitle: '',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false,
            title: '',
          }} 
        />
        <Stack.Screen 
          name="auth" 
          options={{ 
            headerShown: false,
            title: '',
          }} 
        />
        <Stack.Screen 
          name="auth-callback" 
          options={{ 
            headerShown: false,
            title: '',
          }} 
        />
        <Stack.Screen 
          name="auth-popup" 
          options={{ 
            headerShown: false,
            title: '',
          }} 
        />
        <Stack.Screen 
          name="+not-found" 
          options={{
            title: 'Not Found',
          }}
        />
        <Stack.Screen 
          name="location" 
          options={{
            title: 'Shopping Location',
            headerShown: true,
          }}
        />
        <Stack.Screen 
          name="alerts" 
          options={{
            title: 'Price Alerts',
            headerShown: true,
          }}
        />
        <Stack.Screen 
          name="wishlist/[id]" 
          options={{
            title: 'Wishlist',
            headerShown: true,
          }}
        />
        <Stack.Screen 
          name="item/[id]" 
          options={{
            title: 'Item Details',
            headerShown: true,
          }}
        />
        <Stack.Screen 
          name="import-preview" 
          options={{
            title: 'Import Preview',
            headerShown: true,
          }}
        />
        <Stack.Screen 
          name="smart-search" 
          options={{
            title: 'Smart Search',
            headerShown: true,
          }}
        />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
    </>
  );
}

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
    
    // Validate environment configuration (from utils/environmentConfig.ts)
    const verification = verifyConfiguration();
    if (!verification.valid) {
      console.error('❌ ENVIRONMENT CONFIGURATION ERROR:');
      verification.errors.forEach(error => console.error(`  • ${error}`));
      console.error('❌ App cannot start without required configuration');
      setEnvErrors(verification.errors);
    } else {
      console.log('✅ Environment configuration validated successfully');
    }
    
    setEnvChecked(true);
    
    // Log full environment config
    logConfiguration();
    
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
          const verification = verifyConfiguration();
          setEnvErrors(verification.errors);
        }} 
      />
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppThemeProvider>
          <I18nProvider>
            <SmartLocationProvider>
              <LocationProvider>
                <RootLayoutNav />
              </LocationProvider>
            </SmartLocationProvider>
          </I18nProvider>
        </AppThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
