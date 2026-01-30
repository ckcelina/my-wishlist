
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { extractItem, identifyFromImage, searchByName } from '@/utils/supabase-edge-functions';
import { createColors, createTypography, spacing } from '@/styles/designSystem';
import * as Linking from 'expo-linking';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import Constants from 'expo-constants';
import { fetchWishlists, fetchUserLocation } from '@/lib/supabase-helpers';

// This is the iOS-specific version - identical to add.tsx
// Import the default export from add.tsx to avoid code duplication
import AddItemScreen from './add';

export default AddItemScreen;
