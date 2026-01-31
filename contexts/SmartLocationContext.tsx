
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  getSmartLocationSettings,
  updateSmartLocationSettings,
  updateCurrentCountryInBackground,
  SmartLocationSettings,
} from '@/utils/locationDetection';

interface SmartLocationContextType {
  settings: SmartLocationSettings | null;
  loading: boolean;
  isTravel ing: boolean;
  refreshSettings: () => Promise<void>;
  updateActiveSearchCountry: (country: string) => Promise<void>;
  updateHomeCountry: (country: string) => Promise<void>;
  dismissTravelBanner: () => void;
  showTravelBanner: boolean;
}

const SmartLocationContext = createContext<SmartLocationContextType | undefined>(undefined);

export function SmartLocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SmartLocationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTravelBanner, setShowTravelBanner] = useState(false);

  const refreshSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    console.log('[SmartLocation] Refreshing settings');
    try {
      const data = await getSmartLocationSettings();
      setSettings(data);
      
      // Check if user is traveling
      if (data && data.currentCountry !== data.homeCountry) {
        console.log('[SmartLocation] User is traveling:', data.currentCountry);
        setShowTravelBanner(true);
      } else {
        setShowTravelBanner(false);
      }
    } catch (error) {
      console.error('[SmartLocation] Failed to refresh settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Background location update on app launch
  useEffect(() => {
    if (user) {
      console.log('[SmartLocation] Starting background location update');
      updateCurrentCountryInBackground().catch((error) => {
        console.error('[SmartLocation] Background update failed:', error);
      });
    }
  }, [user]);

  const updateActiveSearchCountry = useCallback(async (country: string) => {
    console.log('[SmartLocation] Updating active search country:', country);
    try {
      await updateSmartLocationSettings({ activeSearchCountry: country });
      await refreshSettings();
    } catch (error) {
      console.error('[SmartLocation] Failed to update active search country:', error);
      throw error;
    }
  }, [refreshSettings]);

  const updateHomeCountry = useCallback(async (country: string) => {
    console.log('[SmartLocation] Updating home country:', country);
    try {
      await updateSmartLocationSettings({ homeCountry: country });
      await refreshSettings();
    } catch (error) {
      console.error('[SmartLocation] Failed to update home country:', error);
      throw error;
    }
  }, [refreshSettings]);

  const dismissTravelBanner = useCallback(() => {
    console.log('[SmartLocation] Dismissing travel banner');
    setShowTravelBanner(false);
  }, []);

  const isTraveling = settings ? settings.currentCountry !== settings.homeCountry : false;

  return (
    <SmartLocationContext.Provider
      value={{
        settings,
        loading,
        isTraveling,
        refreshSettings,
        updateActiveSearchCountry,
        updateHomeCountry,
        dismissTravelBanner,
        showTravelBanner,
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
