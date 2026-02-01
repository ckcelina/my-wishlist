
# Location Endpoints 404 Fix - Implementation Complete

## Problem
The app was making requests to:
- `GET https://<something>.app.specular.dev/api/location/smart-settings`
- `GET https://<something>.app.specular.dev/api/location/detect-ip`

These endpoints returned **404 errors** because they were being routed to the Specular backend (which doesn't have these endpoints) instead of Supabase Edge Functions.

## Solution Implemented

### 1. Frontend Routing Fix (`utils/api.ts`)

**Added endpoint mapping** to route location endpoints to Supabase Edge Functions:

```typescript
const edgeFunctionMappings: Record<string, string> = {
  '/api/users/location': 'users-location',
  '/api/location/search-cities': 'location-search-cities',
  '/api/location/smart-settings': 'location-smart-settings',  // ✅ ADDED
  '/api/location/detect-ip': 'location-detect-ip',            // ✅ ADDED
  '/api/alert-settings': 'alert-settings',
  '/api/alert-settings/items-with-targets': 'alert-items-with-targets',
  '/api/health': 'health',
};
```

**How it works:**
- When `authenticatedGet('/api/location/smart-settings')` is called, the `mapApiPathToEdgeFunction()` function detects it should be routed to Supabase
- It automatically constructs the URL: `${SUPABASE_URL}/functions/v1/location-smart-settings`
- Adds proper headers: `apikey` (always) + `Authorization: Bearer <token>` (if logged in)
- Includes dev-only logging for debugging

### 2. Supabase Edge Function: `location-smart-settings`

**Deployed to:** `https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1/location-smart-settings`

**Response Format:**
```json
{
  "ok": true,
  "useIpDetection": true,
  "useLocaleFallback": true
}
```

**Features:**
- ✅ Always returns 200 OK (never 404s)
- ✅ Works for both authenticated and unauthenticated users
- ✅ Includes CORS headers for web compatibility
- ✅ Handles OPTIONS preflight requests
- ✅ Minimal logging (request path only, no tokens)

### 3. Supabase Edge Function: `location-detect-ip`

**Deployed to:** `https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1/location-detect-ip`

**Response Format:**
```json
{
  "ok": true,
  "countryCode": null
}
```

**Features:**
- ✅ Always returns 200 OK (never 404s)
- ✅ Returns stub data (no third-party IP lookup yet)
- ✅ Works for both authenticated and unauthenticated users
- ✅ Includes CORS headers for web compatibility
- ✅ Handles OPTIONS preflight requests
- ✅ Minimal logging (request path only, no tokens)

### 4. Updated `utils/locationDetection.ts`

**Changed `getSmartLocationSettings()`:**
- ❌ OLD: Manually constructed Supabase URL and headers
- ✅ NEW: Uses `authenticatedGet('/api/location/smart-settings')` which automatically routes to the Edge Function

**Changed `detectCurrentCountry()`:**
- Updated response type to match Edge Function: `{ ok: boolean; countryCode: string | null }`

## Verification

### ✅ Acceptance Criteria Met

1. **No more 404 errors** for `/api/location/smart-settings` and `/api/location/detect-ip`
2. **Requests no longer go to Specular backend** for these endpoints
3. **Only these two endpoints are rerouted** - all other endpoints unchanged
4. **Both Edge Functions return 200 JSON** with safe defaults
5. **CORS headers included** for web compatibility
6. **Dev-only logging** shows method, final URL, and status (no tokens)

### Testing

To verify the fix works:

1. **Check frontend logs** for routing confirmation:
   ```
   [API] 🔀 Routing /api/location/smart-settings → Edge Function: location-smart-settings
   [API] 📤 GET https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1/location-smart-settings
   [API] 📥 GET ... - Status: 200 OK
   ```

2. **Check Edge Function logs** (Supabase Dashboard → Edge Functions → Logs):
   ```
   [location-smart-settings] Request: GET /functions/v1/location-smart-settings
   [location-smart-settings] Returning default settings
   ```

3. **Test unauthenticated access:**
   - Open app without logging in
   - Both endpoints should return 200 with defaults

4. **Test authenticated access:**
   - Log in to the app
   - Both endpoints should return 200 with defaults (Bearer token sent but not required)

## Future Enhancements

### For `location-smart-settings`:
- Add a Supabase table `user_smart_location_settings` to store per-user preferences
- Query this table when user is authenticated
- Return personalized settings instead of defaults

### For `location-detect-ip`:
- Integrate a third-party IP geolocation service (e.g., ipapi.co, ipinfo.io)
- Return actual country code based on user's IP address
- Cache results to reduce API calls

## Files Modified

1. ✅ `utils/api.ts` - Added endpoint mapping for location endpoints
2. ✅ `utils/locationDetection.ts` - Updated to use new routing
3. ✅ `supabase/functions/location-smart-settings/index.ts` - Updated Edge Function
4. ✅ `supabase/functions/location-detect-ip/index.ts` - Created new Edge Function

## Deployment Status

- ✅ `location-smart-settings` - Version 2 (ACTIVE)
- ✅ `location-detect-ip` - Version 1 (ACTIVE)

Both functions are live and ready to handle requests.
