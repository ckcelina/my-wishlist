
# API Routing Fix - Complete Implementation

## ✅ What Was Fixed

### C) Fixed `authenticatedFetch`

Updated `utils/api.ts` with the following improvements:

1. **Base URL Validation**
   - Never calls undefined or invalid base URLs
   - Throws clear error: `"API base URL missing or invalid. Check env.ts and app config."`
   - Validates URL format using `new URL()` constructor

2. **Dev-Only Logging** (NO TOKEN LEAKS)
   - HTTP method (GET, POST, PUT, DELETE)
   - Full resolved URL
   - Status code
   - Short response body snippet (max 200 chars)
   - Request body preview (max 200 chars)
   - **CRITICAL**: Authorization headers are NEVER logged

3. **Logging Format**
   ```typescript
   // Request
   [API] 📤 GET https://example.com/api/users/location
   [API] 📦 Body: {"countryCode":"US"}
   
   // Response
   [API] 📥 GET https://example.com/api/users/location - Status: 200 OK
   [API] ✅ Response: {"countryCode":"US","city":"New York"}
   
   // Error
   [API] ❌ Request failed: GET https://example.com/api/users/location
   [API] Status: 404 Not Found
   [API] Response: {"error":"Not found"}
   ```

### D) Removed Dependency on Random /api/* Hosts

Created automatic routing system that maps legacy `/api/*` paths to Supabase Edge Functions:

#### Routing Mappings

| Legacy Path | Edge Function | Method |
|------------|---------------|--------|
| `/api/users/location` | `users-location` | GET, PUT |
| `/api/location/search-cities` | `location-search-cities` | POST |
| `/api/alert-settings` | `alert-settings` | GET, PUT |
| `/api/alert-settings/items-with-targets` | `alert-items-with-targets` | GET |
| `/api/health` | `health` | GET |

#### How It Works

1. **Automatic Detection**: When you call `authenticatedGet('/api/users/location')`, the system automatically detects this should go to an Edge Function

2. **Transparent Routing**: The routing happens inside `authenticatedFetch()`, so no code changes needed in components

3. **Proper Headers**: All Edge Function calls include:
   - `Authorization: Bearer <supabase access token>`
   - `apikey: SUPABASE_ANON_KEY`

4. **Fallback to Backend**: Any `/api/*` path NOT in the mapping table goes to the backend API (Specular)

## 🔧 Implementation Details

### Core Function: `mapApiPathToEdgeFunction()`

```typescript
function mapApiPathToEdgeFunction(path: string): RouteMapping {
  const edgeFunctionMappings: Record<string, string> = {
    '/api/users/location': 'users-location',
    '/api/location/search-cities': 'location-search-cities',
    '/api/alert-settings': 'alert-settings',
    '/api/alert-settings/items-with-targets': 'alert-items-with-targets',
    '/api/health': 'health',
  };

  if (edgeFunctionMappings[path]) {
    return {
      edgeFunctionName: edgeFunctionMappings[path],
      isEdgeFunction: true,
    };
  }

  return {
    edgeFunctionName: '',
    isEdgeFunction: false,
  };
}
```

### Updated `authenticatedFetch()`

```typescript
async function authenticatedFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Check if this endpoint should be routed to an Edge Function
  const routing = mapApiPathToEdgeFunction(endpoint);

  if (routing.isEdgeFunction) {
    // Route to Supabase Edge Function
    return callEdgeFunction<T>(routing.edgeFunctionName, options);
  }

  // Otherwise, use backend API
  // ... validation and fetch logic
}
```

### Updated `callEdgeFunction()`

```typescript
async function callEdgeFunction<T>(
  functionName: string,
  options: RequestInit = {}
): Promise<T> {
  // Validate environment
  const missingKeys = validateEnv();
  if (missingKeys.length > 0) {
    throw new Error(`API base URL missing or invalid. Check env.ts and app config.`);
  }

  const url = `${ENV.SUPABASE_EDGE_FUNCTIONS_URL}/${functionName}`;
  const token = await getBearerToken();

  const headers: HeadersInit = {
    ...options.headers,
    'apikey': ENV.SUPABASE_ANON_KEY,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Dev-only logging (NO TOKEN LEAKS)
  if (__DEV__) {
    console.log(`[API] 📤 ${method} ${url}`);
    // ... body preview
  }

  const response = await fetch(url, { ...options, method, headers });

  // ... error handling and response parsing
}
```

## 📋 Affected Files

### Modified Files
- ✅ `utils/api.ts` - Complete rewrite with routing system
- ✅ `src/config/env.ts` - Already had proper validation

### No Changes Needed
- ✅ `app/alerts.tsx` - Uses `authenticatedGet('/api/alert-settings')` - automatically routed
- ✅ `app/(tabs)/profile.tsx` - Uses `authenticatedGet('/api/users/location')` - automatically routed
- ✅ `app/item/[id].tsx` - Uses backend API endpoints - still work correctly

## 🧪 Testing Checklist

### Manual Testing Required

1. **User Location**
   - [ ] Open Profile screen
   - [ ] Check console logs show: `[API] 🔀 Routing /api/users/location → Edge Function: users-location`
   - [ ] Verify location loads correctly
   - [ ] Edit location and save
   - [ ] Verify PUT request goes to Edge Function

2. **Alert Settings**
   - [ ] Open Alerts screen
   - [ ] Check console logs show: `[API] 🔀 Routing /api/alert-settings → Edge Function: alert-settings`
   - [ ] Verify settings load correctly
   - [ ] Toggle a setting
   - [ ] Verify PUT request goes to Edge Function

3. **City Search**
   - [ ] Open Location screen
   - [ ] Search for a city
   - [ ] Check console logs show: `[API] 🔀 Routing /api/location/search-cities → Edge Function: location-search-cities`
   - [ ] Verify search results appear

4. **Health Check**
   - [ ] Call `/api/health` endpoint
   - [ ] Check console logs show: `[API] 🔀 Routing /api/health → Edge Function: health`
   - [ ] Verify health status returns

5. **Backend API (Fallback)**
   - [ ] Open Item Detail screen
   - [ ] Check console logs show backend URL (NOT Edge Function)
   - [ ] Verify item details load correctly

### Dev-Only Logging Verification

Check that logs show:
- ✅ HTTP method
- ✅ Full URL
- ✅ Status code
- ✅ Response body snippet (max 200 chars)
- ❌ NO Authorization tokens
- ❌ NO apikey values

Example good log:
```
[API] 📤 GET https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1/users-location
[API] 📥 GET https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1/users-location - Status: 200 OK
[API] ✅ Response: {"countryCode":"US","countryName":"United States","city":"New York"}
```

Example bad log (should NEVER happen):
```
❌ [API] Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
❌ [API] apikey: sb_publishable_...
```

## 🚀 Deployment Notes

### Environment Variables Required

All environments (Dev, Preview, Prod) need:
- `SUPABASE_URL` - Already configured in `app.config.js`
- `SUPABASE_ANON_KEY` - Already configured in `app.config.js`
- `SUPABASE_EDGE_FUNCTIONS_URL` - Already configured in `app.config.js`

### Edge Functions Status

All required Edge Functions are deployed and active:
- ✅ `users-location` (verify_jwt: true)
- ✅ `location-search-cities` (verify_jwt: false)
- ✅ `alert-settings` (verify_jwt: true)
- ✅ `alert-items-with-targets` (verify_jwt: true)
- ✅ `health` (verify_jwt: false)

## 🎯 Acceptance Criteria

- [x] `authenticatedFetch` never calls undefined/invalid base URLs
- [x] Clear error message when base URL is missing: `"API base URL missing or invalid. Check env.ts and app config."`
- [x] Dev-only logging shows: method, URL, status, body snippet
- [x] Logs NEVER leak auth tokens
- [x] `/api/users/location` routes to `users-location` Edge Function
- [x] `/api/location/search-cities` routes to `location-search-cities` Edge Function
- [x] `/api/alert-settings` routes to `alert-settings` Edge Function
- [x] `/api/alert-settings/items-with-targets` routes to `alert-items-with-targets` Edge Function
- [x] `/api/health` routes to `health` Edge Function
- [x] All Edge Function requests include `Authorization: Bearer <token>` header
- [x] All Edge Function requests include `apikey: SUPABASE_ANON_KEY` header
- [x] Other `/api/*` paths still go to backend API (fallback)

## 📝 Next Steps

1. **Test the routing** - Open the app and verify console logs show correct routing
2. **Verify no 404s** - Check that all API calls return 200 OK
3. **Test on all platforms** - iOS, Android, Web
4. **Monitor logs** - Ensure no token leaks in production

## 🔗 Related Documentation

- [API Base URL Configuration](./API_BASE_URL_CONFIGURATION.md)
- [404 Fix Implementation](./404_FIX_IMPLEMENTATION.md)
- [Supabase Edge Functions](../SUPABASE_EDGE_FUNCTIONS.md)
