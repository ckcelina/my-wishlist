
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { ConfigurationError } from '@/components/design-system/ConfigurationError';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { fetchWishlists } from '@/lib/supabase-helpers';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSmartLocation } from '@/contexts/SmartLocationContext';
import * as Clipboard from 'expo-clipboard';
import { IconSymbol } from '@/components/IconSymbol';
import { extractItem, identifyFromImage, identifyProductFromImage, searchByName } from '@/utils/supabase-edge-functions';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  Pressable,
} from 'react-native';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import { isEnvironmentConfigured, getConfigurationErrorMessage } from '@/utils/environmentConfig';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';

type ModeType = 'share' | 'url' | 'camera' | 'upload' | 'search';

interface Wishlist {
  id: string;
  name: string;
  isDefault: boolean;
}

interface SearchResult {
  title: string;
  imageUrl: string | null;
  productUrl: string;
  storeDomain: string;
  price: number | null;
  currency: string | null;
  confidence: number;
}

const styles = StyleSheet.create({
  // ... existing styles remain unchanged
});

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) {
    return { uri: '' };
  }
  if (typeof source === 'string') {
    return { uri: source };
  }
  return source as ImageSourcePropType;
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractUrlFromText(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches ? matches[0] : null;
}

export default function AddItemScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { settings } = useSmartLocation();

  const [mode, setMode] = useState<ModeType>('share');
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [selectedWishlist, setSelectedWishlist] = useState<string | null>(null);
  const [showWishlistPicker, setShowWishlistPicker] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [manualTitle, setManualTitle] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualImageUri, setManualImageUri] = useState<string | null>(null);

  const loadWishlists = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const fetchedWishlists = await fetchWishlists(user.id);
      setWishlists(fetchedWishlists);
      const defaultWishlist = fetchedWishlists.find(w => w.isDefault);
      if (defaultWishlist) {
        setSelectedWishlist(defaultWishlist.id);
      }
    } catch (error) {
      console.error('[AddItemScreen] Failed to load wishlists:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadWishlists();
    }
  }, [user, loadWishlists]);

  useFocusEffect(
    useCallback(() => {
      if (params.url && typeof params.url === 'string') {
        setUrl(params.url);
        setMode('url');
      }
    }, [params.url])
  );

  const handleRetryConfiguration = () => {
    console.log('[AddItemScreen] User requested configuration retry');
  };

  const handleExtractUrl = async () => {
    console.log('[AddItemScreen] Extracting URL:', url);
  };

  const handleTakePhoto = async () => {
    console.log('[AddItemScreen] Taking photo');
  };

  const handleIdentifyFromCamera = async () => {
    console.log('[AddItemScreen] Identifying from camera');
  };

  const handleUploadImage = async () => {
    console.log('[AddItemScreen] Uploading image');
  };

  const handleIdentifyFromUpload = async () => {
    console.log('[AddItemScreen] Identifying from upload');
  };

  const handleSearchByName = async () => {
    console.log('[AddItemScreen] Searching by name:', searchQuery);
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    console.log('[AddItemScreen] Selected search result:', result.title);
  };

  const handleManualImagePick = async () => {
    console.log('[AddItemScreen] Picking manual image');
  };

  const handleSaveManual = async () => {
    console.log('[AddItemScreen] Saving manual item');
  };

  const renderShareMode = () => {
    return (
      <View>
        <Text>Share Mode</Text>
      </View>
    );
  };

  const renderUrlMode = () => {
    return (
      <View>
        <Text>URL Mode</Text>
      </View>
    );
  };

  const renderCameraMode = () => {
    return (
      <View>
        <Text>Camera Mode</Text>
      </View>
    );
  };

  const renderUploadMode = () => {
    return (
      <View>
        <Text>Upload Mode</Text>
      </View>
    );
  };

  const renderSearchMode = () => {
    return (
      <View>
        <Text>Search Mode</Text>
      </View>
    );
  };

  if (!isEnvironmentConfigured()) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ConfigurationError
          message={getConfigurationErrorMessage()}
          onRetry={handleRetryConfiguration}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="auto" />
      <ScrollView>
        {mode === 'share' && renderShareMode()}
        {mode === 'url' && renderUrlMode()}
        {mode === 'camera' && renderCameraMode()}
        {mode === 'upload' && renderUploadMode()}
        {mode === 'search' && renderSearchMode()}
      </ScrollView>
    </SafeAreaView>
  );
}
