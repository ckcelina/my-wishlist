
# My Wishlist

A universal wishlist app that allows users to save items from any app or website, track prices automatically, and share wishlists with others.

This app was built using [Natively.dev](https://natively.dev) - a platform for creating mobile apps.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator
- Expo Go app on your physical device (optional)

### Environment Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure required environment variables in `.env`:**

   ```env
   # Backend API URL (required)
   EXPO_PUBLIC_API_BASE_URL=https://your-backend-url.app.specular.dev
   
   # Supabase Configuration (required)
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # Supabase Edge Functions URL (optional, defaults to SUPABASE_URL/functions/v1)
   EXPO_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL=https://your-project-ref.supabase.co/functions/v1
   ```

3. **Update `app.config.js`:**
   
   The environment variables are automatically loaded from `.env` and exposed via `app.config.js`:
   
   ```javascript
   export default {
     expo: {
       extra: {
         backendUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
         supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
         supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
         supabaseEdgeFunctionsUrl: process.env.EXPO_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL,
       }
     }
   }
   ```

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

## 🔧 Configuration

### Environment Variables

All environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | ✅ Yes | Backend API base URL | `https://your-app.app.specular.dev` |
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL | `https://abc123.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anonymous key | `sb_publishable_...` or `eyJhbGci...` |
| `EXPO_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL` | ❌ No | Supabase Edge Functions URL | `https://abc123.supabase.co/functions/v1` |

### Configuration Validation

The app validates environment configuration at startup:

- **Missing variables:** Shows a user-friendly error screen with retry option
- **Invalid URLs:** Logs detailed errors in development mode
- **Development mode:** Displays detailed diagnostic information
- **Production mode:** Shows generic error messages to users

### API Endpoints

All API calls use the configured `EXPO_PUBLIC_API_BASE_URL`. The following endpoints are currently used:

- `GET /api/users/location` - Fetch user's shopping location
- `POST /api/users/location` - Save user's shopping location
- `DELETE /api/users/location` - Remove user's shopping location
- `POST /api/location/search-cities` - Search for cities by name
- `GET /api/alert-settings` - Fetch price drop alert settings
- `PUT /api/alert-settings` - Update price drop alert settings
- `GET /api/alert-settings/items-with-targets` - Get items with target prices

## 🐛 Troubleshooting

### "The requested application does not exist" Error

This error occurs when the API base URL is not configured or is incorrect.

**Solution:**
1. Check that `EXPO_PUBLIC_API_BASE_URL` is set in your `.env` file
2. Verify the URL is correct and accessible
3. Restart the Expo development server after changing `.env`
4. Clear the app cache: `expo start -c`

### Configuration Error Screen

If you see a "Configuration Error" screen:

1. **Development mode:** Check the console for detailed error messages
2. **Missing variables:** Ensure all required variables are set in `.env`
3. **Invalid URLs:** Verify URLs start with `http://` or `https://`
4. **Restart required:** Changes to `.env` require restarting the dev server

### API Call Failures

If API calls are failing:

1. Check the console logs for request URLs and status codes
2. Verify the backend is running and accessible
3. Check network connectivity
4. Review authentication tokens (if applicable)

### Development Tips

- Use `__DEV__` checks to see detailed API logs in development
- Check `src/config/env.ts` for environment configuration
- Review `utils/api.ts` for API client implementation
- Use the diagnostics screen in the app for system health checks

## 📱 Features

- **Universal Wishlist:** Save items from any app or website
- **Price Tracking:** Automatic price updates and drop alerts
- **Smart Location:** Set your shopping location for accurate store availability
- **Multi-Currency:** Support for multiple currencies
- **Sharing:** Share wishlists with friends and family
- **Cross-Platform:** Works on iOS, Android, and Web

## 🏗️ Architecture

- **Frontend:** React Native + Expo 54
- **Backend:** Specular/Natively DB
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **Edge Functions:** Supabase Edge Functions

## 📄 License

Made with 💙 for creativity.
