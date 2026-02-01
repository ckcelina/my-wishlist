
# 🏥 Pre-Build Health Check

## Overview

The health check script (`scripts/healthcheck.ts`) verifies that your environment is correctly configured before building the app. It checks:

1. **Environment Variables**: Ensures all required Supabase configuration is present
2. **Supabase Edge Functions**: Tests connectivity to all critical endpoints
3. **API Responses**: Verifies endpoints return expected status codes

## Running the Health Check

### Option 1: Direct Execution (Recommended)

```bash
npx tsx scripts/healthcheck.ts
```

### Option 2: Using the Shell Script

```bash
chmod +x scripts/run-healthcheck.sh
./scripts/run-healthcheck.sh
```

### Option 3: Add to package.json (Manual Step)

To run the health check automatically before builds, add these scripts to your `package.json`:

```json
{
  "scripts": {
    "healthcheck": "tsx scripts/healthcheck.ts",
    "prebuild": "npm run healthcheck",
    "predeploy": "npm run healthcheck"
  }
}
```

Then the health check will run automatically before:
- `npm run build:web`
- `npm run build:android`
- Any deployment commands

## What It Checks

### 1. Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL` - Must be a valid HTTPS URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Must be present
- `EXPO_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL` - Must be a valid HTTPS URL

### 2. Supabase Edge Functions

- `GET /health` - Health check endpoint (public)
- `GET /users-location` - User location preferences
- `POST /location-search-cities` - City search
- `GET /alert-settings` - Alert settings
- `GET /alert-items-with-targets` - Alert items

## Exit Codes

- **0**: All checks passed ✅
- **1**: One or more checks failed ❌

## Troubleshooting

### "Environment variable missing"

Check your `.env` file or `app.config.js` to ensure all required variables are set:

```javascript
// app.config.js
export default {
  expo: {
    extra: {
      supabaseUrl: 'https://your-project.supabase.co',
      supabaseAnonKey: 'your-anon-key',
      supabaseEdgeFunctionsUrl: 'https://your-project.supabase.co/functions/v1',
    }
  }
}
```

### "Endpoint returned 404"

The Supabase Edge Function may not be deployed. Deploy it using:

```bash
supabase functions deploy <function-name>
```

### "Request timed out"

- Check your internet connection
- Verify the Supabase project is active
- Check Supabase dashboard for service status

## Integration with CI/CD

Add the health check to your CI/CD pipeline:

```yaml
# .github/workflows/build.yml
- name: Run Health Check
  run: npx tsx scripts/healthcheck.ts
```

This ensures broken builds are caught early in the pipeline.
