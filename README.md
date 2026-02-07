# My Wishlist

## Google Lens-Style Visual Search Pipeline

### Overview
My Wishlist now includes a robust, Google Lens-style product identification system powered by OpenAI Vision and visual search providers. Users can take photos of products or upload images, and the app will automatically identify the product and extract details like title, brand, price, and store information.

### Key Features
- **OpenAI Vision First Try:** High-confidence product identification using GPT-4o-mini
- **Rate Limiting:** 20 image searches per day per user (prevents abuse and controls costs)
- **Image Size Validation:** Rejects images > 6MB
- **Structured Responses:** Always returns JSON (never throws raw errors)
- **Privacy-First:** Raw images are NEVER stored in the database
- **Cost Controls:** Comprehensive logging and rate limiting

### Environment Variables (Supabase Edge Secrets)
```bash
# Required for OpenAI Vision
OPENAI_API_KEY=sk-...

# Optional: Visual search providers (future)
VISUAL_SEARCH_PROVIDER=serpapi_google_lens  # or "bing_visual_search" or "none"
SERPAPI_API_KEY=...                         # Required if using SerpAPI
BING_VISUAL_SEARCH_KEY=...                  # Required if using Bing

# Optional: Tuning parameters
VISUAL_SEARCH_TIMEOUT_MS=12000              # Default: 12000ms
VISUAL_SEARCH_MAX_RESULTS=8                 # Default: 8
```

### Files Changed
- `supabase/functions/identify-from-image/index.ts` - Complete pipeline implementation
- `utils/supabase-edge-functions.ts` - Updated client API
- `app/(tabs)/add.tsx` - Updated UI to handle new response format
- Database migration: `image_search_logs` table for rate limiting

### Usage
1. Open My Wishlist app
2. Navigate to Add Item → Camera or Upload
3. Take/upload a photo of a product
4. Tap "Identify Product"
5. Review candidates and select one to add to your wishlist

For detailed documentation, see `DOCS/IDENTIFY_FROM_IMAGE_PIPELINE.md`

---

# My Wishlist

This app was built using [Natively.dev](https://natively.dev) - a platform for creating mobile apps.

Made with 💙 for creativity.
