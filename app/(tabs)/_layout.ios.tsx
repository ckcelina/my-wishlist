
import React, { useEffect } from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createColors } from '@/styles/designSystem';
import { useAppTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { theme } = useAppTheme();
  const colors = createColors(theme);

  // Authentication guard - redirect to login if not authenticated
  useEffect(() => {
    if (loading) {
      console.log('[TabLayout iOS] Auth loading, waiting...');
      return;
    }

    const inAuthGroup = segments[0] === '(tabs)';

    console.log('[TabLayout iOS] Auth state:', {
      user: user?.id || 'none',
      loading,
      inAuthGroup,
      segments,
    });

    if (!user && inAuthGroup) {
      console.log('[TabLayout iOS] User not authenticated, redirecting to /auth');
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

  return (
    <NativeTabs>
      <NativeTabs.Trigger key="wishlists" name="wishlists">
        <Icon sf={{ default: 'heart', selected: 'heart.fill' }} />
        <Label>Wishlists</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="add" name="add">
        <Icon sf={{ default: 'plus.app', selected: 'plus.app.fill' }} />
        <Label>Add</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="profile" name="profile">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
