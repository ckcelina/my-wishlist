
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { 
  fetchWishlists, 
  fetchWishlistItems, 
  createWishlistItem 
} from '@/lib/supabase-helpers';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog';
import { IconSymbol } from '@/components/IconSymbol';
import React, { useState, useEffect, useCallback } from 'react';
import { useAppTheme } from '@/contexts/ThemeContext';
import * as FileSystem from 'expo-file-system/legacy';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageSourcePropType,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';

interface ProductData {
  itemName: string;
  imageUrl: string;
  extractedImages: string[];
  storeName: string;
  storeDomain: string;
  price: number | null;
  currency: string;
  countryAvailability: string[];
  sourceUrl: string;
  notes?: string;
  inputType: 'url' | 'camera' | 'image' | 'name' | 'manual';
}

interface IdentifiedItem {
  title: string;
  imageUrl: string;
  originalUrl: string;
  store: string;
  price: number | null;
  currency: string;
  confidence?: number;
  brand?: string;
}

interface Wishlist {
  id: string;
  name: string;
  is_default: boolean;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) {
    return { uri: '' };
  }
  if (typeof source === 'string') {
    return { uri: source };
  }
  return source as ImageSourcePropType;
}

export default function ImportPreviewScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography } = useAppTheme();
  const params = useLocalSearchParams();

  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [selectedWishlistId, setSelectedWishlistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');

  const loadWishlists = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const fetchedWishlists = await fetchWishlists(user.id);
      setWishlists(fetchedWishlists);
      const defaultWishlist = fetchedWishlists.find(w => w.is_default);
      if (defaultWishlist) {
        setSelectedWishlistId(defaultWishlist.id);
      }
    } catch (error) {
      console.error('[ImportPreviewScreen] Failed to load wishlists:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadWishlists();
    }
  }, [user, loadWishlists]);

  const handleSelectItem = (item: IdentifiedItem) => {
    console.log('[ImportPreviewScreen] Selected item:', item.title);
  };

  const uploadImageToStorage = async (localUri: string): Promise<string | null> => {
    console.log('[ImportPreviewScreen] Uploading image to storage:', localUri);
    return null;
  };

  const checkForDuplicates = async (wishlistId: string, title: string, url: string | null): Promise<boolean> => {
    console.log('[ImportPreviewScreen] Checking for duplicates');
    return false;
  };

  const performSave = async (skipDuplicateCheck: boolean) => {
    console.log('[ImportPreviewScreen] Performing save');
  };

  const handleSave = async () => {
    console.log('[ImportPreviewScreen] Saving items');
  };

  const handleConfirmDuplicate = () => {
    console.log('[ImportPreviewScreen] Confirmed duplicate');
    setShowDuplicateDialog(false);
  };

  const handleCancelDuplicate = () => {
    console.log('[ImportPreviewScreen] Cancelled duplicate');
    setShowDuplicateDialog(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Import Preview',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView>
        <Text>Import Preview Screen</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
