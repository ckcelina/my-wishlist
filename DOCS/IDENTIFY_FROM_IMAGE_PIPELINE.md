
# Identify-From-Image Pipeline - Implementation Complete

## Overview

The `identify-from-image` Edge Function has been upgraded into a **GUARANTEED PIPELINE** that ALWAYS returns a usable response and NEVER silently fails.

## Architecture

### Provider Abstraction (Edge Function Only)

The pipeline uses environment variables to configure visual search providers:

```typescript
VISUAL_SEARCH_PROVIDER = "serpapi_google_lens" | "bing_visual_search"
```

**Required Secrets (Edge Function):**
- `VISUAL_SEARCH_PROVIDER` - Which provider to use
- `SERPAPI_API_KEY` - Required if using SerpAPI
- `BING_VISUAL_SEARCH_KEY` - Required if using Bing
- `VISUAL_SEARCH_TIMEOUT_MS` - Default: 12000 (12 seconds)
- `VISUAL_SEARCH_MAX_RESULTS` - Default: 8
- `OPENAI_API_KEY` - Optional (for first-try high-confidence identification)

**Client NEVER sees these secrets.**

## Pipeline Flow

### STEP A: Optional First Try (OpenAI Vision)

If `OPENAI_API_KEY` exists:
1. Send image to OpenAI Vision (gpt-4o-mini)
2. Extract: itemName, brand, category, confidence, extractedText
3. If confidence >= 0.70 → use as high-confidence result
4. If confidence < 0.70 → fallback to visual search

### STEP B: Google Lens Style Fallback

If no high-confidence result from OpenAI:

**SerpAPI Google Lens:**
```typescript
- Send image to SerpAPI Lens API
- Extract visual_matches + shopping_results
- Returns product URLs with metadata
```

**Bing Visual Search:**
```typescript
- Send image to Bing Visual Search API
- Extract shopping + pagesIncludingImage
- Returns product URLs with metadata
```

### STEP C: Product Extraction

For each candidate URL (up to `VISUAL_SEARCH_MAX_RESULTS * 2`):
1. Fetch HTML server-side
2. Extract schema.org Product data (JSON-LD)
3. Extract OpenGraph metadata
4. Parse: name, image, price, currency, brand
5. If not a product page → keep as web result with basic info

### STEP D: Score + Dedupe

1. **Scoring:**
   - Base score: 0.5
   - Has price + currency: +0.3
   - Has image: +0.1
   - Has brand: +0.1

2. **Deduplication:**
   - Group by hostname
   - Calculate title similarity (80% threshold)
   - Remove duplicates from same store
   - Return top 5-8 results

### STEP E: Guarantee

**ALWAYS returns structured JSON:**

```typescript
{
  status: "ok" | "no_results" | "error",
  providerUsed: "openai_vision" | "serpapi_google_lens" | "bing_visual_search" | "none",
  confidence: number, // 0.0 - 1.0
  query: string, // Text query derived from image
  items: ProductCandidate[], // 0-8 items
  message?: string, // Friendly message for no_results/error
  code?: string // Error code (e.g., "AUTH_REQUIRED", "IMAGE_TOO_LARGE")
}
```

**If nothing found:**
```json
{
  "status": "no_results",
  "providerUsed": "openai_vision",
  "confidence": 0.4,
  "query": "blue running shoes",
  "message": "Could not identify any products. Try cropping the image, improving lighting, or searching manually.",
  "items": []
}
```

**Never throws raw errors.**

## Client Integration

### 1. Call identify-from-image ONCE

```typescript
import { identifyFromImage } from '@/utils/supabase-edge-functions';

const result = await identifyFromImage(undefined, imageBase64);
```

### 2. Handle Responses

```typescript
if (result.status === 'ok' && result.items.length > 0) {
  // Show list of candidates
  // Ask: "Which one is it?"
  router.push({
    pathname: '/import-preview',
    params: { 
      identifiedItems: JSON.stringify(result.items),
      source: 'image_identification' 
    },
  });
} else if (result.status === 'no_results') {
  // Show friendly message
  Alert.alert(
    'No Products Found',
    result.message || 'Try a clearer image or manual search.'
  );
} else if (result.status === 'error') {
  if (result.message === 'AUTH_REQUIRED') {
    // Redirect to login
    router.push('/auth');
  } else {
    // Show error message
    Alert.alert('Error', result.message || 'Failed to identify product.');
  }
}
```

### 3. User Selection Flow

When user selects a candidate:
1. Populate Add Item form with:
   - title
   - brand
   - model
   - imageUrl
   - storeUrl
   - price
   - currency
2. Save item to wishlist

## Important Notes

### Country/Currency Handling

- Country and currency come ONLY from Settings
- Used silently by the pipeline
- NO delivery-address UI in identify flow

### Image Size Limit

- Maximum: 6MB
- Rejected at Edge Function level
- Returns structured error with code `IMAGE_TOO_LARGE`

### Auth Handling

- `verify_jwt=true` on Edge Function
- Client checks auth BEFORE calling
- If AUTH_REQUIRED → redirect to login
- NO retry loops

### Parallel Call Prevention

```typescript
// In utils/supabase-edge-functions.ts
let identifyInProgress = false;

// Prevents multiple parallel identify calls
if (identifyInProgress) {
  return {
    status: 'error',
    message: 'Image identification already in progress. Please wait.',
    ...
  };
}
```

## File Structure

```
supabase/functions/identify-from-image/
├── index.ts                          # Main pipeline orchestrator
├── providers/
│   ├── openai_vision.ts             # OpenAI Vision API wrapper
│   ├── serpapi_google_lens.ts       # SerpAPI Google Lens wrapper
│   └── bing_visual_search.ts        # Bing Visual Search wrapper
└── utils/
    ├── product_extractor.ts         # HTML parsing + schema.org extraction
    └── scoring_deduping.ts          # Scoring + deduplication logic
```

## Provider Modules

### openai_vision.ts

```typescript
export async function callOpenAIVision(
  imageBytes: Uint8Array,
  apiKey: string,
  requestId: string
): Promise<OpenAIVisionResult>
```

Returns:
- itemName
- brand
- category
- confidence (0.0 - 1.0)
- query (text search query)
- extractedText (OCR)

### serpapi_google_lens.ts

```typescript
export async function callSerpAPILens(
  imageBytes: Uint8Array,
  apiKey: string,
  timeoutMs: number,
  requestId: string
): Promise<SerpAPIResult>
```

Returns:
- visual_matches[]
- shopping_results[]

### bing_visual_search.ts

```typescript
export async function callBingVisualSearch(
  imageBytes: Uint8Array,
  apiKey: string,
  timeoutMs: number,
  requestId: string
): Promise<BingVisualSearchResult>
```

Returns:
- shopping[]
- pagesIncludingImage[]

## Utility Modules

### product_extractor.ts

```typescript
export async function extractProductData(
  url: string,
  requestId: string
): Promise<ProductCandidate | null>
```

Extracts:
- schema.org Product (JSON-LD)
- OpenGraph metadata
- Title, price, currency, brand, image

### scoring_deduping.ts

```typescript
export function scoreAndDedupe(
  items: ProductCandidate[],
  maxResults: number,
  requestId: string
): ProductCandidate[]
```

Logic:
- Sort by score (descending)
- Group by hostname
- Calculate title similarity (Jaccard index)
- Remove duplicates (>80% similarity)
- Return top N results

## Testing

### Test with OpenAI Vision Only

```bash
# Set in Supabase Edge Function secrets
OPENAI_API_KEY=sk-...
VISUAL_SEARCH_PROVIDER=  # Leave empty
```

### Test with SerpAPI

```bash
OPENAI_API_KEY=  # Leave empty or set for first-try
VISUAL_SEARCH_PROVIDER=serpapi_google_lens
SERPAPI_API_KEY=...
```

### Test with Bing

```bash
OPENAI_API_KEY=  # Leave empty or set for first-try
VISUAL_SEARCH_PROVIDER=bing_visual_search
BING_VISUAL_SEARCH_KEY=...
```

## Debugging

All logs include `requestId` for tracing:

```
[abc-123] identify-from-image: Request received
[abc-123] User authenticated: user-id
[abc-123] Image fetched: 2.34MB
[abc-123] STEP A: Trying OpenAI Vision
[abc-123] OpenAI Vision result: query="Nike Air Max", confidence=0.85
[abc-123] High confidence result from OpenAI Vision
[abc-123] Pipeline complete in 1234ms
[abc-123] Returning 1 candidates
```

## Error Codes

- `AUTH_REQUIRED` - User not authenticated
- `INVALID_REQUEST` - Invalid JSON payload
- `MISSING_IMAGE_URL` - No imageUrl provided
- `IMAGE_TOO_LARGE` - Image exceeds 6MB
- `IMAGE_FETCH_ERROR` - Failed to fetch image from URL
- `CONFIG_ERROR` - Missing API keys
- `INTERNAL_ERROR` - Unexpected error

## Success Metrics

✅ **GUARANTEED RESPONSE:** Always returns ok/no_results/error
✅ **NO SILENT FAILURES:** All errors are structured and user-friendly
✅ **AUTH HARDENED:** No retry loops, clear AUTH_REQUIRED handling
✅ **PROVIDER ABSTRACTION:** Easy to switch between SerpAPI/Bing
✅ **FALLBACK CHAIN:** OpenAI → Visual Search → Extraction → Scoring
✅ **CLIENT SIMPLICITY:** One call, three outcomes (ok/no_results/error)

## Next Steps

1. **Set Edge Function Secrets:**
   ```bash
   supabase secrets set VISUAL_SEARCH_PROVIDER=serpapi_google_lens
   supabase secrets set SERPAPI_API_KEY=your-key
   supabase secrets set OPENAI_API_KEY=your-key
   supabase secrets set VISUAL_SEARCH_TIMEOUT_MS=12000
   supabase secrets set VISUAL_SEARCH_MAX_RESULTS=8
   ```

2. **Test the Pipeline:**
   - Upload a product image
   - Verify OpenAI Vision runs first
   - Verify fallback to visual search if needed
   - Verify product extraction and scoring
   - Verify no_results message if nothing found

3. **Monitor Logs:**
   ```bash
   supabase functions logs identify-from-image
   ```

## Verification Checklist

- [x] Edge Function deployed with provider modules
- [x] Client wrapper updated with new response types
- [x] Auth guards in place (no parallel calls, check session first)
- [x] Structured error responses (no raw errors)
- [x] Image size validation (6MB limit)
- [x] Provider abstraction (SerpAPI/Bing configurable)
- [x] OpenAI Vision first-try (optional)
- [x] Product extraction from URLs
- [x] Scoring and deduplication
- [x] Guaranteed response (ok/no_results/error)
- [x] Friendly error messages
- [x] Request ID logging for debugging

## Conclusion

The `identify-from-image` pipeline is now production-ready with:
- **Guaranteed responses** (never silent failures)
- **Provider flexibility** (easy to switch/extend)
- **Robust error handling** (structured, user-friendly)
- **Auth hardening** (no retry loops)
- **Comprehensive logging** (request ID tracing)

Users will ALWAYS get either product candidates OR a clear reason why not.
