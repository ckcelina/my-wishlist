
import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
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
