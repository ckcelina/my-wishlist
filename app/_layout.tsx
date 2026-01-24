
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider as AppThemeProvider } from '@/contexts/ThemeContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { verifySupabaseConnection, getSupabaseConfig } from '@/utils/supabase-connection';
import { SUPABASE_CONNECTION_STATUS } from '@/lib/supabase';
import { colors } from '@/styles/designSystem';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      console.log('[RootLayout] Auth loading, waiting...');
      return;
    }

    const inAuthGroup = segments[0] === 'auth' || segments[0] === 'auth-popup' || segments[0] === 'auth-callback';

    console.log('[RootLayout] Auth state changed - User:', user?.id, 'In auth group:', inAuthGroup);

    if (!user && !inAuthGroup) {
      // User is not logged in and not on auth screen, redirect to auth
      console.log('[RootLayout] User not authenticated, redirecting to auth screen');
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      // User is logged in but on auth screen, redirect to wishlists
      console.log('[RootLayout] User authenticated, redirecting to wishlists');
      router.replace('/(tabs)/wishlists');
    }
  }, [user, loading, segments, router]);

  // Show loading screen while checking session
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
      <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      <Stack.Screen name="auth-debug" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
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
              <RootLayoutNav />
              <StatusBar style="auto" />
            </WidgetProvider>
          </I18nProvider>
        </AuthProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
