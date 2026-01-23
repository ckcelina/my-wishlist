
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert } from "react-native";
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
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BACKEND_URL } from "@/utils/api";
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

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
    console.log('[App] Current color scheme:', colorScheme);
  }, [colorScheme]);

  useEffect(() => {
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

  // Custom theme for My Wishlist
  const CustomLightTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "#3b2a1f",
      background: "#ede8e3",
      card: "#ffffff",
      text: "#3b2a1f",
      border: "rgba(0,0,0,0.08)",
      notification: "#FF3B30",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    dark: true,
    colors: {
      primary: "#FFFFFF",
      background: "#765943",
      card: "rgba(255,255,255,0.08)",
      text: "#FFFFFF",
      border: "rgba(255,255,255,0.15)",
      notification: "#FF3B30",
    },
  };

  return (
    <>
      <StatusBar style="auto" animated />
      <NavigationThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomLightTheme}
      >
        <ThemeProvider>
          <AuthProvider>
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
                <SystemBars style={"auto"} />
              </GestureHandlerRootView>
            </WidgetProvider>
          </AuthProvider>
        </ThemeProvider>
      </NavigationThemeProvider>
    </>
  );
}
