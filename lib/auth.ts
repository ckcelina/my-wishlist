
// This file is deprecated and no longer used.
// The app now uses Supabase authentication directly via lib/supabase.ts
// Keeping this file to avoid breaking imports, but all functionality has been moved to AuthContext.tsx

import { Platform } from "react-native";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.backendUrl || "";

export const BEARER_TOKEN_KEY = "wishzen_bearer_token";

// Deprecated: Use Supabase authentication instead
export const authClient = null;

// Deprecated: Use Supabase authentication instead
export function storeWebBearerToken(token: string) {
  console.warn('[auth.ts] storeWebBearerToken is deprecated. Use Supabase authentication instead.');
  if (Platform.OS === "web") {
    localStorage.setItem(BEARER_TOKEN_KEY, token);
  }
}

// Deprecated: Use Supabase authentication instead
export function clearAuthTokens() {
  console.warn('[auth.ts] clearAuthTokens is deprecated. Use Supabase authentication instead.');
  if (Platform.OS === "web") {
    localStorage.removeItem(BEARER_TOKEN_KEY);
  }
}

export { API_URL };
