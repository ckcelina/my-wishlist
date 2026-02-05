
# OpenAI Setup Quick Start Guide

## Problem
Product search returns "No products found" because the OpenAI API key is not configured.

## Solution (2 Steps)

### Step 1: Get an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)
5. **Important**: Ensure your OpenAI account has:
   - ✅ Billing enabled
   - ✅ Credits available
   - ✅ Access to `gpt-4o-mini` model (available by default)

### Step 2: Set the Key in Supabase

Run this command in your terminal:

```bash
supabase secrets set OPENAI_API_KEY=sk-your-actual-key-here
```

**That's it!** The Edge Function will automatically use the key.

## Verify It Works

1. Open the app
2. Go to "Add" tab
3. Tap "Search by Name"
4. Search for "iPhone"
5. Wait 2-5 seconds
6. ✅ Products should appear

## Troubleshooting

### Still seeing "No products found"?

Check the logs:
```bash
supabase functions logs search-by-name
```

**Common Issues:**

1. **"OPENAI_API_KEY not configured"**
   - The secret wasn't set correctly
   - Run the command again: `supabase secrets set OPENAI_API_KEY=sk-...`

2. **"Invalid OpenAI API key" (401 error)**
   - The API key is incorrect or expired
   - Generate a new key from OpenAI dashboard

3. **"OpenAI rate limit exceeded" (429 error)**
   - You've hit your OpenAI API rate limit
   - Wait a few minutes or upgrade your OpenAI plan

4. **"OpenAI model not found" (404 error)**
   - Your API key doesn't have access to `gpt-4o-mini`
   - This is rare - contact OpenAI support

## Cost

- **Per search (without cache)**: ~$0.0002
- **Per search (with cache)**: $0 (results cached for 24 hours)
- **1,000 searches/month**: ~$0.20
- **10,000 searches/month**: ~$2.00

## What Changed?

✅ **Edge Function Updated**: Now uses `gpt-4o-mini` (faster, cheaper)
✅ **Caching Added**: Results cached for 24 hours
✅ **Better Errors**: Clear messages when configuration is missing
✅ **Fallback Option**: Users can add items manually if search fails

## Need Help?

- **OpenAI API Keys**: https://platform.openai.com/api-keys
- **OpenAI Pricing**: https://openai.com/pricing
- **Supabase Secrets**: https://supabase.com/docs/guides/functions/secrets

---

**Quick Command Reference:**

```bash
# Set the OpenAI API key
supabase secrets set OPENAI_API_KEY=sk-your-key-here

# List all secrets (verify it's set)
supabase secrets list

# Check Edge Function logs
supabase functions logs search-by-name

# Check if secret is being read
supabase functions logs search-by-name --tail
```

---

**Status**: Ready to use once OpenAI API key is set! 🚀
