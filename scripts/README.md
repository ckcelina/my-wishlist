
# Pre-Build Health Check

This directory contains scripts that verify the app configuration before building.

## healthcheck.ts

Verifies that:
1. All required environment variables are configured
2. Supabase REST API is reachable
3. All Supabase Edge Functions are deployed and responding

### Usage

```bash
# Run manually
npm run healthcheck

# Automatically runs before build
npm run prebuild
```

### What it checks

- **Environment Variables**: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_EDGE_FUNCTIONS_URL
- **Supabase REST API**: Verifies connection to Supabase database
- **Edge Functions**:
  - `health` - Health check endpoint
  - `users-location` - User location management
  - `location-search-cities` - City search
  - `alert-settings` - Alert settings management

### Exit Codes

- `0` - All checks passed, ready to build
- `1` - One or more checks failed, fix errors before building

### Configuration

The script reads environment variables from:
1. `.env` file in the project root
2. Environment variables (for CI/CD)

Make sure to set these variables before running the health check.
