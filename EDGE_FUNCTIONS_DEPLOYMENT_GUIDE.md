
# Edge Functions Deployment Guide

## Overview

This guide explains how to deploy and verify Edge Functions for the My Wishlist app.

## Deployed Functions

The following Edge Functions are deployed and available:

1. **health** ✅ (Deployed)
   - No authentication required
   - Returns: `{ status: "ok", time: "<ISO timestamp>", version: "edge-health-1" }`
   - Used for: Health checks and diagnostics

2. **identify-product-from-image**
   - Authentication required
   - Uses Google Cloud Vision API
   - Identifies products from images

3. **search-by-name**
   - Authentication required
   - Searches for products by name

4. **extract-item**
   - Authentication required
   - Extracts product details from URLs

5. **find-alternatives**
   - Authentication required
   - Finds alternative stores for products

6. **import-wishlist**
   - Authentication required
   - Imports wishlists from external URLs

7. **alert-items-with-targets**
   - Authentication required
   - Gets items with price alert targets

## Deployment Commands

### Deploy Individual Function

```bash
supabase functions deploy <function-name>
```

Example:
```bash
supabase functions deploy health
```

### Deploy All Functions

```bash
supabase functions deploy extract-item
supabase functions deploy find-alternatives
supabase functions deploy import-wishlist
supabase functions deploy identify-product-from-image
supabase functions deploy search-by-name
supabase functions deploy alert-items-with-targets
supabase functions deploy health
```

## Verification

### Using Diagnostics Screen

1. Open the app
2. Navigate to Profile → Diagnostics
3. Tap "Run Diagnostics"
4. Check the "Edge Functions" section

Expected results:
- **health**: ✅ Available (green)
- Other functions: ✅ Available or ⚠️ Auth Required (both are good)

### Using CLI

```bash
# Test health endpoint (no auth)
curl https://dixgmnuayzblwpqyplsi.supabase.co/functions/v1/health

# Expected response:
# {"status":"ok","time":"2024-01-15T10:30:00.000Z","version":"edge-health-1"}
```

## CI/CD Setup (Optional)

To automatically deploy Edge Functions on push to main:

### GitHub Actions

Create `.github/workflows/deploy-edge-functions.yml`:

```yaml
name: Deploy Edge Functions

on:
  push:
    branches:
      - main
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Deploy Edge Functions
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_REF: dixgmnuayzblwpqyplsi
        run: |
          supabase functions deploy health
          supabase functions deploy extract-item
          supabase functions deploy find-alternatives
          supabase functions deploy import-wishlist
          supabase functions deploy identify-product-from-image
          supabase functions deploy search-by-name
          supabase functions deploy alert-items-with-targets
```

### Required Secrets

Add these to your GitHub repository secrets:
- `SUPABASE_ACCESS_TOKEN`: Your Supabase access token (get from Supabase dashboard)

## Troubleshooting

### Function Shows "Not Deployed"

1. Deploy the function:
   ```bash
   supabase functions deploy <function-name>
   ```

2. Verify deployment:
   ```bash
   supabase functions list
   ```

3. Check logs:
   ```bash
   supabase functions logs <function-name>
   ```

### Function Shows "Auth Required"

This is expected for authenticated functions. The function is deployed and working correctly.

### Function Shows "Server Error"

1. Check function logs:
   ```bash
   supabase functions logs <function-name>
   ```

2. Verify environment variables are set in Supabase dashboard:
   - `GOOGLE_VISION_SA_JSON` (for identify-product-from-image)
   - `GOOGLE_CLOUD_PROJECT_ID` (for identify-product-from-image)

## Function Name Consistency

All function names are centralized in `src/constants/edgeFunctions.ts`:

```typescript
export const EDGE_FUNCTION_NAMES = {
  HEALTH: 'health',
  EXTRACT_ITEM: 'extract-item',
  FIND_ALTERNATIVES: 'find-alternatives',
  IMPORT_WISHLIST: 'import-wishlist',
  IDENTIFY_PRODUCT_FROM_IMAGE: 'identify-product-from-image',
  SEARCH_BY_NAME: 'search-by-name',
  ALERT_ITEMS_WITH_TARGETS: 'alert-items-with-targets',
} as const;
```

**IMPORTANT**: Always use these constants when calling edge functions. Never hardcode function names.

## Testing from App

### Health Function (No Auth)

The health function can be called without authentication:

```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.functions.invoke('health');
console.log(data); // { status: "ok", time: "...", version: "edge-health-1" }
```

### Authenticated Functions

All other functions require authentication:

```typescript
import { identifyProductFromImage } from '@/utils/supabase-edge-functions';

const response = await identifyProductFromImage(imageBase64);
if (response.status === 'ok') {
  console.log('Items:', response.items);
}
```

## Support

If you encounter issues:

1. Check the Diagnostics screen in the app
2. Review function logs in Supabase dashboard
3. Verify environment variables are set
4. Ensure you're using the latest function code

## Summary

✅ **health** function is deployed and working
✅ Diagnostics screen accurately detects function availability
✅ All function names are aligned using `src/constants/edgeFunctions.ts`
✅ Client code uses constants for function names (no hardcoded strings)

The app is now ready to use Edge Functions reliably!
