
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import * as Localization from 'expo-localization';
import { getCurrencyForCountry } from '@/constants/currencies';

export interface LocationContextType {
  countryCode: string | null;
  countryName: string | null;
  cityId: string | null;
  cityName: string | null;
  currencyCode: string;
  loading: boolean;
  updateLocation: (location: {
    countryCode: string;
    countryName: string;
    cityId?: string;
    cityName?: string;
  }) => Promise<void>;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [countryName, setCountryName] = useState<string | null>(null);
  const [cityId, setCityId] = useState<string | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState<string>('USD');
  const [loading, setLoading] = useState(true);

  const refreshLocation = useCallback(async () => {
    if (!user) {
      console.log('[LocationContext] No user, resetting location');
      setCountryCode(null);
      setCountryName(null);
      setCityId(null);
      setCityName(null);
      setCurrencyCode('USD');
      setLoading(false);
      return;
    }

    console.log('[LocationContext] Refreshing location for user:', user.id);
    setLoading(true);

    try {
      // Fetch user settings which includes location data
      const { data, error } = await supabase
        .from('user_settings')
        .select('country, city, currency')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[LocationContext] Error fetching user settings:', error);
        // Fall back to device locale
        const locales = Localization.getLocales();
        if (locales && locales.length > 0 && locales[0].regionCode) {
          const deviceCountryCode = locales[0].regionCode;
          const deviceCountryName = locales[0].country || deviceCountryCode;
          console.log('[LocationContext] Using device locale:', deviceCountryCode);
          setCountryCode(deviceCountryCode);
          setCountryName(deviceCountryName);
          
          // Derive currency from country code
          const currencyCode = getCurrencyForCountry(deviceCountryCode);
          setCurrencyCode(currencyCode);
        }
      } else if (data) {
        console.log('[LocationContext] Loaded location from user settings:', data);
        setCountryCode(data.country);
        setCountryName(data.country); // We'll improve this with a country name lookup
        setCityId(null); // City ID not stored in user_settings yet
        setCityName(data.city);
        setCurrencyCode(data.currency || 'USD');
      } else {
        // No settings found, use device locale
        const locales = Localization.getLocales();
        if (locales && locales.length > 0 && locales[0].regionCode) {
          const deviceCountryCode = locales[0].regionCode;
          const deviceCountryName = locales[0].country || deviceCountryCode;
          console.log('[LocationContext] No settings found, using device locale:', deviceCountryCode);
          setCountryCode(deviceCountryCode);
          setCountryName(deviceCountryName);
          
          // Derive currency from country code
          const currencyCode = getCurrencyForCountry(deviceCountryCode);
          setCurrencyCode(currencyCode);
        }
      }
    } catch (error) {
      console.error('[LocationContext] Exception refreshing location:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  const updateLocation = useCallback(async (location: {
    countryCode: string;
    countryName: string;
    cityId?: string;
    cityName?: string;
  }) => {
    if (!user) {
      console.error('[LocationContext] Cannot update location without user');
      return;
    }

    console.log('[LocationContext] Updating location:', location);

    try {
      // Derive currency from country code
      const newCurrencyCode = getCurrencyForCountry(location.countryCode);

      // Update user_settings table
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          country: location.countryCode,
          city: location.cityName || null,
          currency: newCurrencyCode,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('[LocationContext] Error updating location:', error);
        throw error;
      }

      // Update local state
      setCountryCode(location.countryCode);
      setCountryName(location.countryName);
      setCityId(location.cityId || null);
      setCityName(location.cityName || null);
      setCurrencyCode(newCurrencyCode);

      console.log('[LocationContext] Location updated successfully');
    } catch (error) {
      console.error('[LocationContext] Exception updating location:', error);
      throw error;
    }
  }, [user]);

  return (
    <LocationContext.Provider
      value={{
        countryCode,
        countryName,
        cityId,
        cityName,
        currencyCode,
        loading,
        updateLocation,
        refreshLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
