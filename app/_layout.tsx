
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, Platform, View, ActivityIndicator } from "react-native";
import { useNetworkState } from "expo-network";
import * as Notifications from "expo-notifications";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useAppTheme } from "@/contexts/ThemeContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { BACKEND_URL, authenticatedGet, authenticatedPost } from "@/utils/api";
import { OnboardingModal } from "@/components/OnboardingModal";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// AuthGate component that handles routing based on auth state
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { theme } = useAppTheme();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (loading) {
      console.log('[AuthGate] Auth loading, waiting...');
      return;
    }

    const inAuthGroup = segments[0] === 'auth' || segments[0] === 'auth-popup' || segments[0] === 'auth-callback';
    
    console.log('[AuthGate] Auth state:', { 
      user: user?.id, 
      loading, 
      inAuthGroup, 
      segments: segments.join('/') 
    });

    if (!isNavigationReady) {
      setIsNavigationReady(true);
    }

    if (!user && !inAuthGroup) {
      // User is not signed in and not on auth screen, redirect to auth
      console.log('[AuthGate] No user, redirecting to /auth');
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      // User is signed in but on auth screen, redirect to main app
      console.log('[AuthGate] User authenticated, redirecting to /(tabs)/wishlists');
      router.replace('/(tabs)/wishlists');
    }
  }, [user, loading, segments, isNavigationReady, router]);

  // Check onboarding status
  useEffect(() => {
    if (user && !onboardingChecked) {
      console.log('[AuthGate] Checking onboarding status');
      authenticatedGet<{ completed: boolean; completedAt: string | null }>('/api/users/onboarding-status')
        .then((data) => {
          console.log('[AuthGate] Onboarding status:', data);
          if (!data.completed) {
            setShowOnboarding(true);
          }
          setOnboardingChecked(true);
        })
        .catch((error) => {
          console.error('[AuthGate] Error checking onboarding:', error);
          setOnboardingChecked(true);
        });
    }
  }, [user, onboardingChecked]);

  const handleOnboardingComplete = async () => {
    console.log('[AuthGate] User completed onboarding');
    try {
      await authenticatedPost('/api/users/complete-onboarding', {});
      setShowOnboarding(false);
    } catch (error) {
      console.error('[AuthGate] Error completing onboarding:', error);
      setShowOnboarding(false);
    }
  };

  const handleOnboardingSkip = async () => {
    console.log('[AuthGate] User skipped onboarding');
    try {
      await authenticatedPost('/api/users/complete-onboarding', {});
      setShowOnboarding(false);
    } catch (error) {
      console.error('[AuthGate] Error skipping onboarding:', error);
      setShowOnboarding(false);
    }
  };

  // Show loading screen while checking auth
  if (loading || !isNavigationReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <>
      {children}
      {user && (
        <OnboardingModal
          visible={showOnboarding}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </>
  );
}

function RootLayoutContent() {
  const networkState = useNetworkState();
  const router = useRouter();
  
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      console.log('[App] Fonts loaded successfully');
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    console.log('[App] Backend URL configured:', BACKEND_URL);
  }, []);

  useEffect(() => {
    // Only set up notification handlers on native platforms (iOS/Android)
    if (Platform.OS === 'web') {
      console.log('[App] Skipping notification setup on web');
      return;
    }

    console.log('[App] Setting up notification handlers');

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('[App] Notification received in foreground:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[App] Notification tapped:', response);
      
      const itemId = response.notification.request.content.data?.itemId;
      if (itemId && typeof itemId === 'string') {
        console.log('[App] Navigating to item:', itemId);
        router.push(`/item/${itemId}`);
      }
    });

    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        console.log('[App] App opened from notification:', response);
        const itemId = response.notification.request.content.data?.itemId;
        if (itemId && typeof itemId === 'string') {
          console.log('[App] Navigating to item from launch:', itemId);
          router.push(`/item/${itemId}`);
        }
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [router]);

  React.useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      Alert.alert(
        "🔌 You are offline",
        "You can keep using the app! Your changes will be saved locally and synced when you are back online."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <I18nProvider>
        <ThemedNavigationProvider>
          <AuthProvider>
            <AuthGate>
              <WidgetProvider>
                <GestureHandlerRootView>
                  <Stack>
                  <Stack.Screen name="auth" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                  
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  
                  <Stack.Screen 
                    name="wishlist/[id]" 
                    options={{ 
                      headerShown: true,
                      title: 'Wishlist',
                      headerBackTitle: 'Back'
                    }} 
                  />
                  
                  <Stack.Screen 
                    name="item/[id]" 
                    options={{ 
                      headerShown: true,
                      title: 'Item Details',
                      headerBackTitle: 'Back'
                    }} 
                  />
                  
                  <Stack.Screen 
                    name="shared/[shareSlug]" 
                    options={{ 
                      headerShown: true,
                      title: 'Shared Wishlist',
                      headerBackTitle: 'Back'
                    }} 
                  />
                  
                  <Stack.Screen 
                    name="alerts" 
                    options={{ 
                      headerShown: true,
                      title: 'Alert Settings',
                      headerBackTitle: 'Back'
                    }} 
                  />
                </Stack>
                  <ThemedSystemBars />
                </GestureHandlerRootView>
              </WidgetProvider>
            </AuthGate>
          </AuthProvider>
        </ThemedNavigationProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

// Themed Navigation Provider that uses the theme context
function ThemedNavigationProvider({ children }: { children: React.ReactNode }) {
  const { theme, isDark } = useAppTheme();

  // Custom theme for My Wishlist based on current theme
  const CustomLightTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: theme.colors.accent,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: "#FF3B30",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    dark: true,
    colors: {
      primary: theme.colors.accent,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: "#FF3B30",
    },
  };

  return (
    <NavigationThemeProvider value={isDark ? CustomDarkTheme : CustomLightTheme}>
      {children}
    </NavigationThemeProvider>
  );
}

// Themed System Bars that match the current theme
function ThemedSystemBars() {
  const { isDark } = useAppTheme();
  
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} animated />
      <SystemBars style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return <RootLayoutContent />;
}
