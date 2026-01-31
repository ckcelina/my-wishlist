
# API Base URL Configuration - Implementation Summary

## Overview

This document describes the robust API base URL configuration system implemented to eliminate all relative `/api/...` calls that were causing 404 "The requested application does not exist" errors.

## Problem Statement

The app was making API calls using relative paths like `/api/users/location`, which resulted in 404 errors because:
1. No base URL was configured
2. Relative paths don't work in mobile apps (they need absolute URLs)
3. Environment variables were not properly validated at runtime

## Solution Architecture

### 1. Centralized Environment Configuration (`src/config/env.ts`)

**Purpose:** Single source of truth for all environment variables with runtime validation.

**Features:**
- Loads environment variables from `app.config.js` extra section
- Normalizes URLs (removes trailing slashes)
- Validates required variables at runtime
- Provides user-friendly error messages
- Logs configuration on app startup

**Key Functions:**
```typescript
export const ENV: EnvConfig = {
  API_BASE_URL: string,
  SUPABASE_URL: string,
  SUPABASE_ANON_KEY: string,
  SUPABASE_EDGE_FUNCTIONS_URL: string,
}

export function validateEnv(): string | null
export function getConfigurationErrorMessage(): string
export function logEnvironmentConfig(): void
```

### 2. Updated API Client (`utils/api.ts`)

**Purpose:** Unified API client that constructs absolute URLs from base URL + endpoint path.

**Key Changes:**
- Imports `ENV` from `src/config/env.ts`
- Validates environment before making requests
- Constructs absolute URLs: `${API_BASE_URL}${endpoint}`
- Ensures base URL never ends with `/` and paths always start with `/`
- Logs request URLs and status codes in development mode
- Provides detailed error messages for debugging

**API Functions:**
```typescript
// Authenticated requests
authenticatedGet<T>(endpoint: string): Promise<T>
authenticatedPost<T>(endpoint: string, data: any): Promise<T>
authenticatedPut<T>(endpoint: string, data: any): Promise<T>
authenticatedDelete<T>(endpoint: string): Promise<T>

// Public requests
apiGet<T>(endpoint: string): Promise<T>
apiPost<T>(endpoint: string, data: any): Promise<T>
```

### 3. Configuration Error Screen (`components/design-system/ConfigurationError.tsx`)

**Purpose:** User-friendly error screen when environment configuration is missing or invalid.

**Features:**
- Shows clear error message to users
- Provides retry button
- Displays detailed diagnostic info in development mode
- Prevents app crashes from missing configuration

### 4. Environment Variables Documentation

**Files:**
- `.env.example` - Template with all required variables
- `README.md` - Comprehensive setup and troubleshooting guide

**Required Variables:**
```env
EXPO_PUBLIC_API_BASE_URL=https://your-backend-url.app.specular.dev
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL=https://your-project-ref.supabase.co/functions/v1
```

## Updated Endpoints

All endpoints now use the configured `EXPO_PUBLIC_API_BASE_URL`:

### Location Endpoints
- `GET /api/users/location` - Fetch user's shopping location
- `POST /api/users/location` - Save user's shopping location
- `DELETE /api/users/location` - Remove user's shopping location
- `POST /api/location/search-cities` - Search for cities by name

### Alert Settings Endpoints
- `GET /api/alert-settings` - Fetch price drop alert settings
- `PUT /api/alert-settings` - Update price drop alert settings
- `GET /api/alert-settings/items-with-targets` - Get items with target prices

## Implementation Details

### URL Construction Logic

```typescript
function constructApiUrl(endpoint: string): string {
  // 1. Validate environment configuration
  const validationError = validateEnv();
  if (validationError) {
    throw new Error(`Environment configuration error: ${validationError}`);
  }

  // 2. Check API_BASE_URL is configured
  if (!ENV.API_BASE_URL) {
    throw new Error('API_BASE_URL is not configured');
  }

  // 3. Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // 4. Construct full URL (base URL already has trailing slashes removed)
  const fullUrl = `${ENV.API_BASE_URL}${normalizedEndpoint}`;
  
  return fullUrl;
}
```

### Error Handling

**Development Mode:**
- Detailed error messages with stack traces
- Request/response logging
- Configuration diagnostics

**Production Mode:**
- User-friendly error messages
- No sensitive information exposed
- Graceful fallbacks

### Logging

**Startup Logs:**
```
═══════════════════════════════════════════════════
🌍 ENVIRONMENT CONFIGURATION
═══════════════════════════════════════════════════
Platform: ios
Build Type: Development
═══════════════════════════════════════════════════
📡 API Configuration:
  API Base URL: https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev
  Supabase URL: https://dixgmnuayzblwpqyplsi.supabase.co
  Supabase Key: ✅ Configured
═══════════════════════════════════════════════════
✅ All environment variables configured correctly
═══════════════════════════════════════════════════
```

**Request Logs (Development):**
```
[API] GET https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev/api/users/location
[API] Response: 200 OK
[API] Response data: { id: '...', countryCode: 'US', ... }
```

**Error Logs:**
```
[API] ❌ Request failed: GET https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev/api/users/location
[API] Status: 404 Not Found
[API] Response body: {"error":"User location not found"}
```

## Testing & Verification

### Acceptance Criteria ✅

1. **No relative URLs:** All API calls use absolute URLs constructed from `EXPO_PUBLIC_API_BASE_URL`
2. **Runtime validation:** App validates environment configuration on startup
3. **User-friendly errors:** Missing configuration shows clear error screen with retry button
4. **Development diagnostics:** Detailed logging in development mode
5. **Production safety:** Generic error messages in production builds
6. **Cross-platform:** Works identically in Expo Go, TestFlight, and App Store builds

### Manual Testing Steps

1. **Test with valid configuration:**
   ```bash
   # Set environment variables in .env
   EXPO_PUBLIC_API_BASE_URL=https://your-backend.app.specular.dev
   
   # Start app
   npm run dev
   
   # Verify:
   # - App starts successfully
   # - API calls work
   # - No 404 errors
   ```

2. **Test with missing configuration:**
   ```bash
   # Remove API_BASE_URL from .env
   
   # Start app
   npm run dev
   
   # Verify:
   # - Configuration error screen appears
   # - Clear error message shown
   # - Retry button works
   ```

3. **Test API calls:**
   ```bash
   # Navigate to Location screen
   # Verify:
   # - City search works
   # - Location save works
   # - No relative URL errors
   
   # Navigate to Alerts screen
   # Verify:
   # - Settings load correctly
   # - Updates save successfully
   # - No 404 errors
   ```

## Troubleshooting

### "The requested application does not exist" Error

**Cause:** API base URL is not configured or is incorrect.

**Solution:**
1. Check `.env` file has `EXPO_PUBLIC_API_BASE_URL` set
2. Verify the URL is correct and accessible
3. Restart Expo dev server: `expo start -c`
4. Check console logs for detailed error messages

### Configuration Error Screen

**Cause:** Required environment variables are missing or invalid.

**Solution:**
1. Copy `.env.example` to `.env`
2. Fill in all required variables
3. Restart Expo dev server
4. Check console for validation errors

### API Calls Still Failing

**Cause:** Backend is not running or not accessible.

**Solution:**
1. Verify backend URL is correct
2. Check backend is running and accessible
3. Test URL in browser or Postman
4. Check network connectivity
5. Review backend logs

## Migration Guide

### For Existing Code

**Before:**
```typescript
// ❌ Relative URL - causes 404
const response = await fetch('/api/users/location');
```

**After:**
```typescript
// ✅ Use API client with absolute URL
import { authenticatedGet } from '@/utils/api';
const data = await authenticatedGet<UserLocation>('/api/users/location');
```

### For New Endpoints

```typescript
// 1. Import API client
import { authenticatedGet, authenticatedPost } from '@/utils/api';

// 2. Use with endpoint path (starts with /)
const data = await authenticatedGet<MyData>('/api/my-endpoint');

// 3. For POST/PUT with data
const result = await authenticatedPost<Result>('/api/my-endpoint', {
  field1: 'value1',
  field2: 'value2',
});
```

## Best Practices

1. **Always use API client functions** - Never use raw `fetch()` for API calls
2. **Start paths with /** - Endpoint paths should always start with `/`
3. **Type your responses** - Use TypeScript generics for type safety
4. **Handle errors gracefully** - Use try-catch blocks and show user-friendly messages
5. **Log in development** - Use `__DEV__` checks for detailed logging
6. **Validate configuration** - Check environment variables before making requests

## Files Modified

1. **Created:**
   - `src/config/env.ts` - Centralized environment configuration
   - `components/design-system/ConfigurationError.tsx` - Error screen component
   - `.env.example` - Environment variables template
   - `DOCS/API_BASE_URL_CONFIGURATION.md` - This documentation

2. **Updated:**
   - `utils/api.ts` - API client with absolute URL construction
   - `app.config.js` - Support for EXPO_PUBLIC_API_BASE_URL
   - `app/_layout.tsx` - Added environment validation on startup
   - `README.md` - Added environment setup documentation

3. **Verified:**
   - `app/(tabs)/profile.tsx` - Uses authenticatedGet/authenticatedPut
   - `app/alerts.tsx` - Uses authenticatedGet/authenticatedPut
   - `app/location.tsx` - Uses authenticatedGet/authenticatedPost/authenticatedDelete
   - `components/pickers/CityPicker.tsx` - Uses apiPost

## Conclusion

The robust API base URL configuration system ensures:
- ✅ No more relative `/api/...` calls
- ✅ All requests use absolute URLs
- ✅ Runtime validation prevents crashes
- ✅ User-friendly error handling
- ✅ Comprehensive logging for debugging
- ✅ Cross-platform compatibility
- ✅ Production-ready error messages

All API calls now use the configured `EXPO_PUBLIC_API_BASE_URL` and failures show clear error messages with retry buttons.
