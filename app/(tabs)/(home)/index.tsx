
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { createTypography, createComponentStyles } from '@/styles/theme';
import { Logo } from '@/components/Logo';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Divider } from '@/components/design-system/Divider';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/IconSymbol';

export default function HomeScreen() {
  const { theme, isDark } = useAppTheme();
  const { user } = useAuth();
  const typography = createTypography(theme);
  const componentStyles = createComponentStyles(theme);
  const router = useRouter();
  
  const [connectionStatus, setConnectionStatus] = useState<{
    supabaseConnected: boolean;
    authWorking: boolean;
    databaseWorking: boolean;
    checking: boolean;
  }>({
    supabaseConnected: false,
    authWorking: false,
    databaseWorking: false,
    checking: true,
  });
  
  console.log('[HomeScreen] Rendering with theme:', theme.mode);
  
  useEffect(() => {
    checkConnections();
  }, []);
  
  const checkConnections = async () => {
    console.log('[HomeScreen] Checking connections...');
    setConnectionStatus(prev => ({ ...prev, checking: true }));
    
    try {
      // Check Supabase auth
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      const authWorking = !authError;
      console.log('[HomeScreen] Auth check:', authWorking ? 'Working' : 'Failed', authError?.message);
      
      // Check Supabase database
      const { data: dbData, error: dbError } = await supabase
        .from('wishlists')
        .select('id')
        .limit(1);
      const databaseWorking = !dbError;
      console.log('[HomeScreen] Database check:', databaseWorking ? 'Working' : 'Failed', dbError?.message);
      
      setConnectionStatus({
        supabaseConnected: authWorking && databaseWorking,
        authWorking,
        databaseWorking,
        checking: false,
      });
      
      console.log('[HomeScreen] Connection status:', {
        supabaseConnected: authWorking && databaseWorking,
        authWorking,
        databaseWorking,
      });
    } catch (error) {
      console.error('[HomeScreen] Error checking connections:', error);
      setConnectionStatus({
        supabaseConnected: false,
        authWorking: false,
        databaseWorking: false,
        checking: false,
      });
    }
  };
  
  const themeMode = isDark ? 'Dark Mode' : 'Light Mode';
  const userEmail = user?.email || 'Not signed in';
  const userStatus = user ? 'Authenticated' : 'Not authenticated';
  
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'My Wishlist',
          ...(Platform.OS === 'ios' && { headerLargeTitle: true }),
        }}
      />
      <SafeAreaView style={componentStyles.container} edges={['top', 'left', 'right']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Logo size="large" />
            <Text style={[typography.caption, { marginTop: theme.spacing.xs }]}>
              {themeMode}
            </Text>
          </View>
          
          <Divider />
          
          <View style={styles.section}>
            <Text style={typography.sectionTitle}>Welcome</Text>
            <Text style={[typography.body, { marginTop: theme.spacing.sm, color: theme.colors.textSecondary }]}>
              Your universal wishlist app with automatic light and dark mode support.
            </Text>
          </View>
          
          <Card style={{ marginTop: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={24}
                color={theme.colors.success}
              />
              <Text style={[typography.subsectionTitle, { marginLeft: theme.spacing.sm }]}>
                Connection Status
              </Text>
            </View>
            
            {connectionStatus.checking ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
                <Text style={typography.bodySmall}>Checking connections...</Text>
              </View>
            ) : (
              <View style={{ gap: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <IconSymbol
                    ios_icon_name={connectionStatus.supabaseConnected ? 'checkmark.circle' : 'xmark.circle'}
                    android_material_icon_name={connectionStatus.supabaseConnected ? 'check-circle' : 'cancel'}
                    size={20}
                    color={connectionStatus.supabaseConnected ? theme.colors.success : theme.colors.error}
                  />
                  <Text style={typography.bodyMedium}>
                    Supabase: 
                  </Text>
                  <Text style={[typography.bodyMedium, { color: connectionStatus.supabaseConnected ? theme.colors.success : theme.colors.error }]}>
                    {connectionStatus.supabaseConnected ? 'Connected' : 'Disconnected'}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <IconSymbol
                    ios_icon_name={connectionStatus.authWorking ? 'checkmark.circle' : 'xmark.circle'}
                    android_material_icon_name={connectionStatus.authWorking ? 'check-circle' : 'cancel'}
                    size={20}
                    color={connectionStatus.authWorking ? theme.colors.success : theme.colors.error}
                  />
                  <Text style={typography.bodyMedium}>
                    Authentication: 
                  </Text>
                  <Text style={[typography.bodyMedium, { color: connectionStatus.authWorking ? theme.colors.success : theme.colors.error }]}>
                    {connectionStatus.authWorking ? 'Working' : 'Failed'}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <IconSymbol
                    ios_icon_name={connectionStatus.databaseWorking ? 'checkmark.circle' : 'xmark.circle'}
                    android_material_icon_name={connectionStatus.databaseWorking ? 'check-circle' : 'cancel'}
                    size={20}
                    color={connectionStatus.databaseWorking ? theme.colors.success : theme.colors.error}
                  />
                  <Text style={typography.bodyMedium}>
                    Database: 
                  </Text>
                  <Text style={[typography.bodyMedium, { color: connectionStatus.databaseWorking ? theme.colors.success : theme.colors.error }]}>
                    {connectionStatus.databaseWorking ? 'Working' : 'Failed'}
                  </Text>
                </View>
              </View>
            )}
            
            <Button
              title="Refresh Status"
              onPress={checkConnections}
              variant="secondary"
              style={{ marginTop: theme.spacing.md }}
            />
          </Card>
          
          <Card style={{ marginTop: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <IconSymbol
                ios_icon_name="person.circle.fill"
                android_material_icon_name="account-circle"
                size={24}
                color={theme.colors.accent}
              />
              <Text style={[typography.subsectionTitle, { marginLeft: theme.spacing.sm }]}>
                User Status
              </Text>
            </View>
            
            <View style={{ gap: theme.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={typography.bodyMedium}>Status: </Text>
                <Text style={[typography.bodyMedium, { color: user ? theme.colors.success : theme.colors.textSecondary }]}>
                  {userStatus}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={typography.bodyMedium}>Email: </Text>
                <Text style={[typography.bodyMedium, { color: theme.colors.textSecondary }]}>
                  {userEmail}
                </Text>
              </View>
            </View>
          </Card>
          
          <Card style={{ marginTop: theme.spacing.md }}>
            <Text style={typography.subsectionTitle}>Design System</Text>
            <Text style={[typography.bodySmall, { marginTop: theme.spacing.sm, color: theme.colors.textSecondary }]}>
              This app features a comprehensive design system with:
            </Text>
            <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
              <Text style={typography.bodyMedium}>• Automatic theme switching</Text>
              <Text style={typography.bodyMedium}>• Elegant typography hierarchy</Text>
              <Text style={typography.bodyMedium}>• Rounded corners and soft shadows</Text>
              <Text style={typography.bodyMedium}>• Calm spacing and breathing room</Text>
            </View>
          </Card>
          
          <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
            <Button
              title="View Wishlists"
              onPress={() => {
                console.log('[HomeScreen] Navigating to wishlists');
                router.push('/(tabs)/wishlists');
              }}
              variant="primary"
            />
            
            <Button
              title="Add Item"
              onPress={() => {
                console.log('[HomeScreen] Navigating to add item');
                router.push('/(tabs)/add');
              }}
              variant="secondary"
            />
            
            <Button
              title="Run Diagnostics"
              onPress={() => {
                console.log('[HomeScreen] Navigating to diagnostics');
                router.push('/diagnostics-enhanced');
              }}
              variant="secondary"
            />
          </View>
          
          <View style={{ height: theme.spacing.xxl }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
  },
});
