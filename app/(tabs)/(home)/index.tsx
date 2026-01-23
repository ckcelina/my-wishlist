
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createTypography, createComponentStyles } from '@/styles/theme';
import { Logo } from '@/components/Logo';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Divider } from '@/components/design-system/Divider';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { theme, isDark } = useAppTheme();
  const typography = createTypography(theme);
  const componentStyles = createComponentStyles(theme);
  const router = useRouter();
  
  console.log('[HomeScreen] Rendering with theme:', theme.mode);
  
  const themeMode = isDark ? 'Dark Mode' : 'Light Mode';
  
  return (
    <SafeAreaView style={[componentStyles.container, { paddingTop: 20 }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Logo size="large" />
          <Text style={[typography.pageTitle, { marginTop: theme.spacing.md }]}>
            My Wishlist
          </Text>
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
        
        <Card style={{ marginTop: theme.spacing.md }}>
          <Text style={typography.subsectionTitle}>Typography</Text>
          <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
            <Text style={typography.pageTitle}>Page Title</Text>
            <Text style={typography.sectionTitle}>Section Title</Text>
            <Text style={typography.body}>Body text with clean readability</Text>
            <Text style={typography.caption}>Caption text for subtle information</Text>
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
        </View>
        
        <View style={{ height: theme.spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
  },
  section: {
    marginTop: 16,
  },
});
