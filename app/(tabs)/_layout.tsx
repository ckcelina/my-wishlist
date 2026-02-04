
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createColors } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { theme, isDark } = useAppTheme();
  const colors = createColors(theme);

  // Authentication guard - redirect to login if not authenticated
  useEffect(() => {
    if (loading) {
      console.log('[TabLayout] Auth loading, waiting...');
      return;
    }

    const inAuthGroup = segments[0] === '(tabs)';

    console.log('[TabLayout] Auth state:', {
      user: user?.id || 'none',
      loading,
      inAuthGroup,
      segments,
    });

    if (!user && inAuthGroup) {
      console.log('[TabLayout] User not authenticated, redirecting to /auth');
      router.replace('/auth');
    }
  }, [user, loading, segments, router]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Don't render tabs if user is not authenticated
  if (!user) {
    return null;
  }

  // Define the tabs configuration
  const tabs: TabBarItem[] = [
    {
      name: 'lists',
      route: '/(tabs)/lists',
      icon: 'favorite-border', // Heart outline icon
      label: 'Wishlists',
    },
    {
      name: 'add',
      route: '/(tabs)/add',
      icon: 'add-circle', // Plus inside a circle (Material Design equivalent)
      label: 'Add',
      emphasized: true, // Mark as primary CTA
    },
    {
      name: 'profile',
      route: '/(tabs)/profile',
      icon: 'person-outline', // User outline icon
      label: 'Profile',
    },
  ];

  // For Android and Web, use Stack navigation with custom floating tab bar
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
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
          key="lists" 
          name="lists" 
          options={{
            title: 'Wishlists',
            headerShown: false,
          }}
        />
        <Stack.Screen 
          key="add" 
          name="add" 
          options={{
            title: 'Add Item',
            headerShown: false,
          }}
        />
        <Stack.Screen 
          key="profile" 
          name="profile" 
          options={{
            title: 'Profile',
            headerShown: false,
          }}
        />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
