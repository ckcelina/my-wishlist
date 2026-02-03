
// DEPRECATED: This file has been removed.
// All add-item flows now use app/import-preview.tsx for a unified experience.
// 
// If you reached this screen, please report a bug.
// Expected navigation: app/(tabs)/add.tsx → app/import-preview.tsx

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';

export default function DeprecatedConfirmProductScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Deprecated Screen',
          headerBackTitle: 'Back',
        }}
      />
      <View style={styles.content}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle"
          android_material_icon_name="warning"
          size={64}
          color="#FF9500"
        />
        <Text style={styles.title}>This screen is deprecated</Text>
        <Text style={styles.message}>
          All add-item flows now use the unified Import Preview screen.
        </Text>
        <Text style={styles.submessage}>
          If you reached this screen, please report a bug.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(tabs)/add')}
        >
          <Text style={styles.buttonText}>Go to Add Item</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  submessage: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
