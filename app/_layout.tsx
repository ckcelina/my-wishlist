
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/contexts/ThemeContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { verifySupabaseConnection, getSupabaseConfig } from '@/utils/supabase-connection';
import { runNativelySupabaseVerification, logNativelyConnectionStatus } from '@/utils/natively-supabase-verification';
import { SUPABASE_CONNECTION_STATUS } from '@/lib/supabase';
import { createColors } from '@/styles/designSystem';
import { 
  logAppVersionToSupabase, 
  getVersionInfo, 
  displayVersionInfo,
  checkForUpdatesAndLog 
} from '@/utils/versionTracking';
import { logEnvironmentInfo, validateEnvironmentConfig } from '@/utils/environmentConfig';
import { runParityVerification, logEnvironmentSummary } from '@/utils/parityVerification';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const { theme, isDark } = useAppTheme();
  const colors = useMemo(() => createColors(theme), [theme]);
  const segments = useSegments();
  const router = useRouter();

  const styles = useMemo(() => StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
  }), [colors]);

  useEffect(() => {
    if (loading) {
      console.log('[RootLayout] Auth loading, waiting...');
      return;
    }

    const inAuthGroup = segments[0] === 'auth' || segments[0] === 'auth-popup' || segments[0] === 'auth-callback';

    console.log('[RootLayout] Auth state changed - User:', user?.id, 'In auth group:', inAuthGroup);

    if (!user && !inAuthGroup) {
      console.log('[RootLayout] User not authenticated, redirecting to auth screen');
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      console.log('[RootLayout] User authenticated, redirecting to wishlists');
      router.replace('/(tabs)/wishlists');
    }
  }, [user, loading, segments, router]);

  // Check for updates and log version when user is authenticated
  useEffect(() => {
    if (user && !loading) {
      console.log('[RootLayout] User authenticated, checking for EAS updates...');
      checkForUpdatesAndLog(user.id).catch((error) => {
        console.error('[RootLayout] Error checking for updates:', error);
      });
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <Stack 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
        <Stack.Screen name="auth-debug" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

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
    console.log('[App] ═══════════════════════════════════════════════════');
    console.log('[App] 🚀 MY WISHLIST APP STARTING');
    console.log('[App] ═══════════════════════════════════════════════════');
    
    // Log environment configuration for UI parity verification
    logEnvironmentInfo();
    
    // Validate environment configuration
    const validation = validateEnvironmentConfig();
    if (!validation.valid) {
      console.error('[App] ❌ Environment configuration is invalid:');
      validation.errors.forEach(error => console.error(`[App]    - ${error}`));
    } else {
      console.log('[App] ✅ Environment configuration is valid');
    }
    
    // Display and log version information
    getVersionInfo().then((versionInfo) => {
      displayVersionInfo(versionInfo);
      
      // Log version to Supabase (without user ID on app start)
      // This will track every app launch and deployment
      logAppVersionToSupabase().catch((error) => {
        console.error('[App] Error logging version on app start:', error);
      });
    });
    
    console.log('[App] 🔌 Verifying Supabase connection for Natively.dev...');
    console.log('[App] ═══════════════════════════════════════════════════');
    
    logNativelyConnectionStatus();
    
    const config = getSupabaseConfig();
    console.log('[App] 📋 Supabase Config:', config);
    console.log('[App] 📊 Supabase Connection Status:', SUPABASE_CONNECTION_STATUS);
    
    runNativelySupabaseVerification().then((status) => {
      console.log('[App] ═══════════════════════════════════════════════════');
      if (status.verified) {
        console.log('[App] ✅✅✅ SUPABASE CONNECTION VERIFIED FOR NATIVELY.DEV ✅✅✅');
        console.log('[App] ═══════════════════════════════════════════════════');
        console.log('[App] 🎉 Connection Status: ACTIVE');
        console.log('[App] 🎉 Integration Status: VERIFIED');
        console.log('[App] 🎉 Natively Detection: SUCCESS');
        console.log('[App] ═══════════════════════════════════════════════════');
        console.log('[App] Details:');
        console.log('[App] - URL:', status.url);
        console.log('[App] - Auth working:', status.authWorking);
        console.log('[App] - Database working:', status.databaseWorking);
        console.log('[App] - Anon key configured:', status.hasAnonKey);
        console.log('[App] - Natively detected:', status.nativelyDetected);
        console.log('[App] ═══════════════════════════════════════════════════');
      } else {
        console.error('[App] ⚠️  Supabase verification incomplete');
        console.error('[App] Status:', status);
        if (status.error) {
          console.error('[App] Error:', status.error);
        }
      }
    }).catch((error) => {
      console.error('[App] ❌ Verification failed with error:', error);
    });
    
    verifySupabaseConnection().then((legacyStatus) => {
      console.log('[App] 📋 Legacy verification result:', legacyStatus);
    });
    
    // Run parity verification
    console.log('[App] 🔍 Running parity verification...');
    runParityVerification().then((report) => {
      if (report.overallPassed) {
        console.log('[App] ✅✅✅ PARITY VERIFICATION PASSED ✅✅✅');
        console.log('[App] ✅ Expo Go and production builds are identical');
      } else {
        console.error('[App] ❌ PARITY VERIFICATION FAILED');
        console.error('[App] ❌ Some checks did not pass');
        console.error('[App] ❌ Review the report above');
      }
    }).catch((error) => {
      console.error('[App] ❌ Parity verification failed with error:', error);
    });
    
    // Log environment summary
    logEnvironmentSummary();
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
              <RootLayoutNav />
            </WidgetProvider>
          </I18nProvider>
        </AuthProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
