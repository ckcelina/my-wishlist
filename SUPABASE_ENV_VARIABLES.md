
# Supabase Environment Variables

This document lists all Supabase environment variables configured in the My Wishlist app.

## Configuration Location

All Supabase environment variables are configured in `app.json` under the `extra` section:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://dixgmnuayzblwpqyplsi.supabase.co",
      "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "backendUrl": "https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev"
    }
  }
}
```

## Environment Variables

### 1. `supabaseUrl`
- **Value**: `https://dixgmnuayzblwpqyplsi.supabase.co`
- **Description**: The URL of your Supabase project
- **Usage**: Used by the Supabase client to connect to your database and auth services
- **Location**: `lib/supabase.ts`

### 2. `supabaseAnonKey`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT token)
- **Description**: The anonymous/public API key for your Supabase project
- **Usage**: Used for authentication and authorization with Supabase services
- **Security**: Safe to expose in client apps (protected by Row Level Security policies)
- **Location**: `lib/supabase.ts`

### 3. `backendUrl`
- **Value**: `https://dp5sm9gseg2u24kanaj9us8ayp8awmu3.app.specular.dev`
- **Description**: The URL of the Specular backend API
- **Usage**: Used for backend API calls that don't go through Supabase
- **Location**: `utils/api.ts`

## How to Access Environment Variables

### In TypeScript/JavaScript:

```typescript
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;
const backendUrl = Constants.expoConfig?.extra?.backendUrl;
```

### In Supabase Client:

```typescript
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

## Supabase Edge Functions

The following Edge Functions are deployed to Supabase and require the `OPENAI_API_KEY` secret to be set in Supabase:

1. **extract-item**: Extracts product details from URLs
2. **find-alternatives**: Finds alternative stores for products
3. **import-wishlist**: Imports items from store wishlist URLs
4. **identify-from-image**: Identifies products from images

### Setting Edge Function Secrets:

```bash
# Set the OpenAI API key for Edge Functions
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key
```

## Supabase Database Tables

The app uses the following Supabase tables:

1. **wishlists**: User wishlists
2. **wishlist_items**: Items in wishlists
3. **price_history**: Price tracking history
4. **shared_wishlists**: Shared wishlist links

All tables have Row Level Security (RLS) enabled.

## Authentication Configuration

### Supported Auth Methods:
- Email/Password authentication
- Google OAuth
- Apple OAuth

### OAuth Redirect URLs:
- iOS/Android: `mywishlist://auth-callback`
- Web: `https://your-domain.com/auth-callback`

### Associated Domains (iOS):
- `applinks:mywishlist.app`
- `applinks:dixgmnuayzblwpqyplsi.supabase.co`

## Verification

To verify your Supabase connection:

1. Open the app
2. Navigate to Profile → Diagnostics
3. Check the connection status

Or use the utility function:

```typescript
import { verifySupabaseConnection } from '@/utils/supabase-connection';

const status = await verifySupabaseConnection();
console.log('Connected:', status.connected);
console.log('Auth configured:', status.authConfigured);
console.log('Database accessible:', status.databaseAccessible);
```

## Troubleshooting

### Connection Issues:
1. Verify `supabaseUrl` and `supabaseAnonKey` are correct in `app.json`
2. Check that the Supabase project is active
3. Verify Row Level Security policies are configured
4. Check the Diagnostics screen for detailed status

### Auth Issues:
1. Verify OAuth providers are enabled in Supabase dashboard
2. Check redirect URLs are configured correctly
3. Verify associated domains are set up for iOS

### Database Issues:
1. Run the migration script: `supabase/migrations/20260124_create_wishlist_schema.sql`
2. Verify RLS policies are enabled
3. Check that tables exist in Supabase dashboard

## Security Notes

1. **Anon Key**: Safe to expose in client apps (protected by RLS)
2. **Service Role Key**: NEVER expose in client apps (only use server-side)
3. **OpenAI API Key**: Stored securely in Supabase secrets (not in app code)
4. **User Data**: Protected by Row Level Security policies

## Additional Resources

- [Supabase Setup Guide](./SUPABASE_SETUP.md)
- [Edge Functions Documentation](./SUPABASE_EDGE_FUNCTIONS.md)
- [Edge Functions Setup](./SUPABASE_EDGE_FUNCTION_SETUP.md)
