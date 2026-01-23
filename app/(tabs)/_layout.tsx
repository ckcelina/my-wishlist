
import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';

export default function TabLayout() {
  // Define the tabs configuration
  const tabs: TabBarItem[] = [
    {
      name: 'wishlists',
      route: '/(tabs)/wishlists',
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
          animation: 'fade', // Smooth transition animations
        }}
      >
        <Stack.Screen key="wishlists" name="wishlists" />
        <Stack.Screen key="add" name="add" />
        <Stack.Screen key="profile" name="profile" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
