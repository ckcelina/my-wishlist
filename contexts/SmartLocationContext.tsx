
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchUserLocation } from '@/lib/supabase-helpers';

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
      console.log('[SmartLocation] No user, resetting settings');
      setSettings(null);
      setLoading(false);
      return;
    }

    console.log('[SmartLocation] Refreshing settings from Supabase user profile');
    setLoading(true);
    
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
      // Set defaults on error - don't crash the app
      setSettings({
        activeSearchCountry: null, // Don't assume US - let user set it
        currencyCode: null,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const updateActiveSearchCountry = useCallback(async (country: string) => {
    if (!user?.id) {
      console.error('[SmartLocation] Cannot update country without user');
      return;
    }

    console.log('[SmartLocation] Updating active search country:', country);
    try {
      // Update Supabase user location
      const { updateUserLocation } = await import('@/lib/supabase-helpers');
      await updateUserLocation(user.id, {
        countryCode: country,
        countryName: country, // You may want to map this to full country name
      });
      await refreshSettings();
      console.log('[SmartLocation] Country updated successfully');
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
