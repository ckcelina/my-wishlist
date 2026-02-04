
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchUserLocation } from '@/lib/supabase-helpers';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Smart Location Context - SETTINGS-BASED ONLY
 * 
 * This context provides access to the user's country setting from their Supabase profile.
 * Country is managed EXCLUSIVELY in the Settings screen.
 * 
 * CHANGES:
 * - No longer calls /api/location/* endpoints (404 errors removed)
 * - Reads country directly from Supabase user profiles
 * - No automatic IP-based detection
 * - No "Select delivery address" UI
 * - activeSearchCountry comes from Settings only
 * - Auto-refreshes when app comes to foreground
 */

export interface SmartLocationSettings {
  activeSearchCountry: string | null;
  currencyCode: string | null;
}

export interface SmartLocationContextType {
  settings: SmartLocationSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateActiveSearchCountry: (country: string) => Promise<void>;
}

const SmartLocationContext = createContext<SmartLocationContextType | undefined>(undefined);

export function SmartLocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SmartLocationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    console.log('[SmartLocation] Refreshing settings from Supabase user profile');
    try {
      // Read country from Supabase user location
      const locationData = await fetchUserLocation(user.id);
      
      if (locationData) {
        setSettings({
          activeSearchCountry: locationData.countryCode || null,
          currencyCode: null, // Currency is managed separately in user settings
        });
        console.log('[SmartLocation] Settings loaded:', locationData.countryCode);
      } else {
        // No location set - user needs to set it in Settings
        setSettings({
          activeSearchCountry: null,
          currencyCode: null,
        });
        console.log('[SmartLocation] No location set - user must configure in Settings');
      }
    } catch (error) {
      console.error('[SmartLocation] Failed to refresh settings:', error);
      // Set defaults on error
      setSettings({
        activeSearchCountry: 'US', // Safe fallback
        currencyCode: null,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // CRITICAL FIX: Auto-refresh when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[SmartLocation] App became active, refreshing settings');
        refreshSettings();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [refreshSettings]);

  const updateActiveSearchCountry = useCallback(async (country: string) => {
    console.log('[SmartLocation] Updating active search country:', country);
    try {
      // Update Supabase user location
      const { updateUserLocation } = await import('@/lib/supabase-helpers');
      if (user?.id) {
        await updateUserLocation(user.id, {
          countryCode: country,
          countryName: country, // You may want to map this to full country name
        });
        await refreshSettings();
      }
    } catch (error) {
      console.error('[SmartLocation] Failed to update active search country:', error);
      throw error;
    }
  }, [user, refreshSettings]);

  return (
    <SmartLocationContext.Provider
      value={{
        settings,
        loading,
        refreshSettings,
        updateActiveSearchCountry,
      }}
    >
      {children}
    </SmartLocationContext.Provider>
  );
}

export function useSmartLocation() {
  const context = useContext(SmartLocationContext);
  if (context === undefined) {
    throw new Error('useSmartLocation must be used within a SmartLocationProvider');
  }
  return context;
}
