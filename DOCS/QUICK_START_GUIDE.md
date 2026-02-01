
# Quick Start Guide - New Features

## Overview

This guide shows you how to use the newly implemented features:
- User location preferences
- Alert settings
- Alert items with target prices

All features are accessible via the existing `utils/api.ts` helpers.

---

## 1. User Location Preferences

### Get User Location

```typescript
import { authenticatedGet } from '@/utils/api';

// Get user's location preferences
const location = await authenticatedGet<{
  user_id: string;
  country_code: string;
  country_name: string;
  city: string;
  currency_code: string;
  updated_at: string;
}>('/api/users/location');

// Returns empty object {} if no preferences set
console.log(location);
```

### Update User Location

```typescript
import { authenticatedPut } from '@/utils/api';

// Update user's location preferences
const updated = await authenticatedPut('/api/users/location', {
  countryCode: 'JO',
  countryName: 'Jordan',
  city: 'Amman',
  currencyCode: 'JOD',
});

console.log('Location updated:', updated);
```

---

## 2. City Search

### Search for Cities

```typescript
import { authenticatedPost } from '@/utils/api';

// Search for cities (with optional country filter)
const result = await authenticatedPost<{
  results: Array<{
    id: string;
    name: string;
    country: string;
    countryName: string;
  }>;
}>('/api/location/search-cities', {
  query: 'amman',
  countryCode: 'JO', // Optional
});

console.log('Cities found:', result.results);
```

**Important:** This endpoint always returns `200` with `{ results: [] }`, never 404.

---

## 3. Alert Settings

### Get Alert Settings

```typescript
import { authenticatedGet } from '@/utils/api';

// Get user's alert settings
const settings = await authenticatedGet<{
  user_id: string;
  enabled: boolean;
  updated_at: string;
}>('/api/alert-settings');

// Returns { enabled: false } if no settings exist
console.log('Alerts enabled:', settings.enabled);
```

### Update Alert Settings

```typescript
import { authenticatedPut } from '@/utils/api';

// Enable or disable alerts
const updated = await authenticatedPut('/api/alert-settings', {
  enabled: true,
});

console.log('Alert settings updated:', updated);
```

---

## 4. Alert Items with Target Prices

### Get Alert Items

```typescript
import { authenticatedGet } from '@/utils/api';

// Get all alert items for the user
const result = await authenticatedGet<{
  items: Array<{
    id: string;
    user_id: string;
    item_id: string;
    target_price: number | null;
    currency_code: string | null;
    created_at: string;
  }>;
}>('/api/alert-settings/items-with-targets');

// Returns { items: [] } if no items exist
console.log('Alert items:', result.items);
```

---

## 5. Health Check

### Check API Health

```typescript
import { authenticatedGet } from '@/utils/api';

// Check if Supabase Edge Functions are healthy
const health = await authenticatedGet<{
  ok: boolean;
  timestamp: string;
  supabaseUrlPresent: boolean;
  supabaseAnonKeyPresent: boolean;
  service: string;
  version: string;
}>('/api/health');

console.log('API health:', health);
```

**Note:** This endpoint does not require authentication.

---

## Complete Example: Location Setup Flow

```typescript
import { authenticatedGet, authenticatedPut, authenticatedPost } from '@/utils/api';

async function setupUserLocation() {
  try {
    // 1. Check if user has location set
    const currentLocation = await authenticatedGet('/api/users/location');
    
    if (!currentLocation.country_code) {
      console.log('No location set, prompting user...');
      
      // 2. Search for cities
      const cities = await authenticatedPost('/api/location/search-cities', {
        query: 'amman',
        countryCode: 'JO',
      });
      
      console.log('Available cities:', cities.results);
      
      // 3. User selects a city, save it
      const selectedCity = cities.results[0];
      
      await authenticatedPut('/api/users/location', {
        countryCode: selectedCity.country,
        countryName: selectedCity.countryName,
        city: selectedCity.name,
        currencyCode: 'JOD',
      });
      
      console.log('Location saved!');
    } else {
      console.log('User location already set:', currentLocation);
    }
  } catch (error) {
    console.error('Error setting up location:', error);
  }
}
```

---

## Complete Example: Alert Setup Flow

```typescript
import { authenticatedGet, authenticatedPut } from '@/utils/api';

async function setupAlerts() {
  try {
    // 1. Check current alert settings
    const settings = await authenticatedGet('/api/alert-settings');
    
    console.log('Current alert settings:', settings);
    
    // 2. Enable alerts if not already enabled
    if (!settings.enabled) {
      await authenticatedPut('/api/alert-settings', {
        enabled: true,
      });
      
      console.log('Alerts enabled!');
    }
    
    // 3. Get items with target prices
    const alertItems = await authenticatedGet('/api/alert-settings/items-with-targets');
    
    console.log('Items with alerts:', alertItems.items);
    
    // Display items to user...
  } catch (error) {
    console.error('Error setting up alerts:', error);
  }
}
```

---

## Error Handling

All endpoints return proper error responses:

```typescript
try {
  const result = await authenticatedGet('/api/users/location');
  console.log(result);
} catch (error) {
  if (error instanceof Error) {
    console.error('API Error:', error.message);
    
    // Check if it's an authentication error
    if (error.message.includes('401')) {
      console.log('User not authenticated');
      // Redirect to login...
    }
  }
}
```

---

## TypeScript Types

Create type definitions for better type safety:

```typescript
// types/api.ts

export interface UserLocation {
  user_id: string;
  country_code: string;
  country_name: string;
  city: string;
  currency_code: string;
  updated_at: string;
}

export interface City {
  id: string;
  name: string;
  country: string;
  countryName: string;
}

export interface AlertSettings {
  user_id: string;
  enabled: boolean;
  updated_at: string;
}

export interface AlertItem {
  id: string;
  user_id: string;
  item_id: string;
  target_price: number | null;
  currency_code: string | null;
  created_at: string;
}
```

Then use them:

```typescript
import { authenticatedGet } from '@/utils/api';
import type { UserLocation, AlertSettings } from '@/types/api';

const location = await authenticatedGet<UserLocation>('/api/users/location');
const settings = await authenticatedGet<AlertSettings>('/api/alert-settings');
```

---

## Testing

Run the health check to verify everything is working:

```bash
npx tsx scripts/healthcheck.ts
```

Expected output:
```
═══════════════════════════════════════════════════════════════
🚀 PRE-BUILD HEALTH CHECK
═══════════════════════════════════════════════════════════════

📋 Step 1: Verifying Environment Variables

  ✅ SUPABASE_URL: https://dixgmnuayzblwpqyplsi.supabase.co
  ✅ SUPABASE_ANON_KEY: Configured
  ✅ SUPABASE_EDGE_FUNCTIONS_URL: https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1

✅ All environment variables are configured correctly.

═══════════════════════════════════════════════════════════════
🌐 Step 2: Testing Supabase Edge Functions

  🔍 Testing GET Health Check...
     ✅ Status: 200 OK
  🔍 Testing GET Users Location (GET)...
     ✅ Status: 401 OK
  ...

═══════════════════════════════════════════════════════════════
✅ ALL HEALTH CHECKS PASSED!
═══════════════════════════════════════════════════════════════
```

---

## Next Steps

1. **Integrate into UI**: Use these APIs in your React Native screens
2. **Add Loading States**: Show spinners while fetching data
3. **Handle Errors**: Display user-friendly error messages
4. **Cache Data**: Consider caching location data locally
5. **Test on Devices**: Test on iOS, Android, and Web

---

## Support

If you encounter issues:
1. Check the health check output
2. View Supabase Edge Function logs in the dashboard
3. Check browser/app console for errors
4. Verify authentication tokens are valid
