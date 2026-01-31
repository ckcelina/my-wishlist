
# Add Item UX Flow - Complete Design Document

## 📱 Overview

This document defines the **exact UX flow** for adding items to wishlists in the "My Wishlist" app. The flow is designed to be intuitive, AI-powered, and optimized for both speed and accuracy.

---

## 🎯 Core Flow: Camera → AI → Web → Price → Image → Confirm

### **Flow Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADD ITEM ENTRY POINT                      │
│                     (5 Input Methods Available)                  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
            ┌───────────┐  ┌───────────┐  ┌───────────┐
            │   SHARE   │  │    URL    │  │  CAMERA   │
            │  (from    │  │  (paste   │  │  (take    │
            │   apps)   │  │   link)   │  │  photo)   │
            └───────────┘  └───────────┘  └───────────┘
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
            ┌───────────┐  ┌───────────┐  ┌───────────┐
            │  UPLOAD   │  │  SEARCH   │  │   SMART   │
            │  (from    │  │  (by      │  │  SEARCH   │
            │  gallery) │  │  name)    │  │  (AI)     │
            └───────────┘  └───────────┘  └───────────┘
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   AI EXTRACTION & ANALYSIS   │
                    │  • Identify product          │
                    │  • Extract title, brand      │
                    │  • Find best image           │
                    │  • Detect price & store      │
                    └─────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   WEB PRICE SEARCH (AI)      │
                    │  • Generate store queries    │
                    │  • Search 6-12 stores        │
                    │  • Extract prices            │
                    │  • Verify shipping           │
                    │  • Rank by total cost        │
                    └─────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   IMAGE AUTO-SELECT          │
                    │  • URL: Use og:image         │
                    │  • Camera: Use captured      │
                    │  • Search: Use best result   │
                    │  • Fallback: Placeholder     │
                    └─────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   IMPORT PREVIEW SCREEN      │
                    │  • Show extracted data       │
                    │  • Display price offers      │
                    │  • Allow manual edits        │
                    │  • Change photo option       │
                    │  • Select wishlist           │
                    └─────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   DUPLICATE DETECTION        │
                    │  • Check URL match           │
                    │  • Fuzzy title match         │
                    │  • Image hash comparison     │
                    │  • Show modal if found       │
                    └─────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   CONFIRMATION & SAVE        │
                    │  • User confirms product     │
                    │  • Upload image if local     │
                    │  • Save to Supabase          │
                    │  • Save price offers         │
                    │  • Navigate to wishlist      │
                    └─────────────────────────────┘
```

---

## 🔄 Detailed Step-by-Step Flow

### **Step 1: Entry Point - Add Item Screen**

**Location:** `app/(tabs)/add.tsx`

**5 Input Methods:**

1. **Share (from other apps)**
   - User shares product link from Safari, Amazon app, etc.
   - Deep link opens app with URL pre-filled
   - Automatically triggers extraction

2. **URL (paste link)**
   - User manually pastes product URL
   - Validates URL format
   - Extracts product data via Edge Function

3. **Camera (take photo)**
   - Opens device camera
   - User takes photo of product
   - AI identifies product from image

4. **Upload (from gallery)**
   - Opens photo library
   - User selects existing photo
   - AI identifies product from image

5. **Search (by name)**
   - User enters product name, brand, model
   - Searches web for matching products
   - Shows list of results to choose from

**Smart Search Button:**
- Prominent button for AI-powered search
- Routes to dedicated Smart Search screen
- Most comprehensive search option

---

### **Step 2: AI Extraction & Analysis**

**Edge Functions Used:**
- `extract-item` (for URLs)
- `identify-from-image` (for photos)
- `search-by-name` (for text search)

**AI Tasks:**
1. **Product Identification**
   - Extract product title
   - Identify brand and model
   - Determine category
   - Detect variants (color, size, etc.)

2. **Image Extraction**
   - Find og:image meta tag (for URLs)
   - Extract all product images
   - Select highest resolution
   - Prefer clean background images

3. **Price Detection**
   - Extract current price
   - Detect currency
   - Find original price (if on sale)
   - Identify store name and domain

4. **Availability Check**
   - Determine available countries
   - Check stock status
   - Estimate delivery time

**Output:**
```typescript
{
  itemName: string;
  imageUrl: string;
  extractedImages: string[];
  storeName: string;
  storeDomain: string;
  price: number | null;
  currency: string;
  countryAvailability: string[];
  sourceUrl: string;
  inputType: 'url' | 'image' | 'camera' | 'name';
}
```

---

### **Step 3: Web Price Search (AI-Powered)**

**Location:** `app/smart-search.tsx` or triggered from Import Preview

**Backend Endpoint:** `POST /api/items/ai-price-search`

**AI Search Pipeline:**

1. **Query Normalization (Stage 1)**
   - AI analyzes product name
   - Extracts key attributes (brand, model, specs)
   - Generates canonical product identifier
   - Duration: ~800ms

2. **Store Query Generation (Stage 2)**
   - AI generates 6-12 search queries
   - Tailored to user's country
   - Includes local retailers + global marketplaces
   - Examples:
     - "iPhone 15 Pro 256GB site:amazon.com"
     - "iPhone 15 Pro 256GB site:bestbuy.com"
     - "iPhone 15 Pro 256GB site:apple.com"
   - Duration: ~1000ms

3. **Price Extraction (Stage 3)**
   - Fetch HTML from product pages
   - Extract price, currency, availability
   - Parse shipping information
   - Detect sale prices vs. original
   - Duration: ~1200ms

4. **Shipping Verification (Stage 4)**
   - Check if store ships to user's country
   - Calculate shipping cost
   - Estimate delivery time
   - Filter out unavailable stores
   - Duration: ~800ms

5. **Photo Selection (Stage 5)**
   - AI chooses best canonical product image
   - Prefers high-resolution, clean background
   - Deduplicates similar images
   - Duration: ~600ms

6. **Offer Ranking (Final)**
   - Calculate total cost (price + shipping)
   - Rank by reliability and confidence
   - Sort by best value
   - Return top offers

**Output:**
```typescript
{
  offers: [
    {
      storeName: string;
      storeDomain: string;
      productUrl: string;
      price: number;
      currency: string;
      originalPrice?: number;
      shippingCost?: number;
      deliveryTime?: string;
      availability: 'in_stock' | 'out_of_stock' | 'limited_stock';
      confidenceScore: number;
    }
  ];
  best_image_url: string;
  canonical_product_url: string;
}
```

**Progress UI:**
- Shows 5 stages with animated progress bar
- Real-time stage labels
- Percentage completion (0% → 100%)
- Smooth transitions between stages

---

### **Step 4: Image Auto-Select**

**Logic:** `autoSelectImage()` in `app/import-preview.tsx`

**Priority Rules:**

1. **URL Input:**
   - Use extracted og:image (highest priority)
   - Fallback to first extracted image
   - Fallback to placeholder

2. **Camera Input:**
   - Use captured photo (user's intent)
   - No fallback needed

3. **Upload Input:**
   - Use uploaded photo (user's intent)
   - No fallback needed

4. **Name Search:**
   - Use best search result image
   - Fallback to placeholder

5. **Smart Search:**
   - Use AI-selected canonical image
   - Fallback to first offer image
   - Fallback to placeholder

**Image Upload:**
- Local images (file://) are uploaded to Supabase Storage
- Generates unique filename: `{userId}/{timestamp}.{ext}`
- Returns public URL
- Handles upload failures gracefully

---

### **Step 5: Import Preview Screen**

**Location:** `app/import-preview.tsx`

**UI Sections:**

1. **Warnings Card** (if incomplete data)
   - Shows missing fields
   - Allows manual completion
   - Non-blocking (user can still save)

2. **Product Image**
   - Large preview (300px height)
   - "Change Photo" button
   - Shows placeholder if no image

3. **Editable Fields**
   - Item Name (required)
   - Store Name & Domain
   - Price & Currency
   - Wishlist selector
   - Notes (optional)

4. **Country Availability**
   - Shows if available in user's country
   - Warning if not available
   - Links to location settings

5. **Price Offers Section**
   - Shows up to 3 offers inline
   - Store name, domain, price
   - Shipping cost and delivery time
   - Link to open store URL
   - "+X more offers will be saved" if >3

6. **"Find Prices Online" Button**
   - Triggers AI Price Search
   - Requires shipping location
   - Shows modal if location missing

7. **Confirmation Toggle**
   - "This is the correct product"
   - Must be enabled to save
   - Prevents accidental saves

**Footer Actions:**
- **Retry Extraction:** Go back and try again
- **Report Problem:** Submit feedback
- **Confirm & Add:** Save to wishlist (primary action)

---

### **Step 6: Duplicate Detection**

**Logic:** `checkForDuplicates()` in `app/import-preview.tsx`

**Detection Rules:**

1. **Exact URL Match (100% similarity)**
   - Compare normalized URLs
   - Instant duplicate detection

2. **Fuzzy Title Match (>70% similarity)**
   - Tokenize titles into words
   - Calculate Jaccard similarity
   - Threshold: 0.7 (70%)

3. **Image Hash Comparison (future)**
   - Perceptual hash of images
   - Detect visually similar products
   - Threshold: 0.8 (80%)

**Duplicate Modal:**
- Shows potential duplicates
- Displays similarity score
- Options:
  - **Add Anyway:** Save as new item
  - **Replace:** Update existing item (future)
  - **Cancel:** Go back

---

### **Step 7: Confirmation & Save**

**Final Steps:**

1. **Validation**
   - Item name is required
   - "Correct product" toggle must be ON
   - Wishlist must be selected

2. **Image Upload** (if local)
   - Upload to Supabase Storage
   - Get public URL
   - Fallback to placeholder on failure

3. **Save Item**
   - Insert into `wishlist_items` table
   - Fields: title, image_url, current_price, currency, original_url, source_domain, notes

4. **Save Offers** (if any)
   - Call `POST /api/items/{itemId}/save-offers`
   - Insert into `price_offers` table
   - Store all offer details

5. **Success Navigation**
   - Show success alert
   - Navigate to wishlist detail screen
   - Item appears in list immediately

---

## 🎨 UX Best Practices

### **Loading States**
- Show spinners for async operations
- Display progress bars for multi-stage processes
- Provide stage labels ("Analyzing product...")
- Never leave user wondering what's happening

### **Error Handling**
- Show friendly error messages
- Provide retry options
- Allow manual fallback (edit fields)
- Never block user from saving

### **Permissions**
- Request camera permission contextually
- Show explanation before requesting
- Provide fallback if denied (upload instead)
- Link to settings if permission denied

### **Offline Support**
- Cache extracted data locally
- Allow saving without price search
- Sync offers when back online
- Show offline indicator

### **Accessibility**
- Large touch targets (min 44x44pt)
- High contrast colors
- Screen reader labels
- Keyboard navigation support

---

## 📊 Performance Targets

| Stage | Target Duration | Max Duration |
|-------|----------------|--------------|
| URL Extraction | 2-3s | 5s |
| Image Identification | 3-4s | 6s |
| Name Search | 1-2s | 4s |
| AI Price Search | 4-6s | 10s |
| Image Upload | 1-2s | 5s |
| Duplicate Check | <500ms | 1s |
| Save Item | <1s | 2s |

**Total Flow Duration:**
- Fast path (URL with cache): ~3-5s
- Normal path (URL + price search): ~8-12s
- Slow path (camera + AI + price search): ~12-18s

---

## 🔧 Technical Implementation

### **Edge Functions**
- `extract-item`: Extract product from URL
- `identify-from-image`: Identify product from photo
- `search-by-name`: Search web for product
- `ai-price-search`: Multi-store price comparison (future)

### **Backend Endpoints**
- `POST /api/items/ai-price-search`: AI-powered price search
- `POST /api/items/{itemId}/save-offers`: Save price offers
- `GET /api/items/{itemId}/offers`: Get saved offers

### **Database Tables**
- `wishlist_items`: Core item data
- `price_offers`: Store offers and prices
- `price_history`: Historical price tracking
- `user_settings`: User preferences and location

### **Supabase Storage**
- Bucket: `item-images`
- Path: `{userId}/{timestamp}.{ext}`
- Public access for display
- Automatic cleanup of unused images

---

## 🚀 Future Enhancements

1. **Barcode Scanning**
   - Scan product barcodes
   - Instant product lookup
   - Works offline with local database

2. **Voice Input**
   - "Add iPhone 15 Pro to wishlist"
   - Hands-free item addition
   - Natural language processing

3. **Browser Extension**
   - One-click add from any website
   - Auto-extract product details
   - Sync with mobile app

4. **Bulk Import**
   - Import from Amazon wishlist
   - Import from CSV/Excel
   - Migrate from other apps

5. **Smart Suggestions**
   - "You might also like..."
   - Based on browsing history
   - Personalized recommendations

6. **Price Drop Predictions**
   - ML model predicts future drops
   - "Wait 2 weeks for 15% off"
   - Historical price analysis

---

## ✅ Success Metrics

### **User Experience**
- Time to add item: <30 seconds
- Extraction accuracy: >90%
- Price search success rate: >85%
- User satisfaction: >4.5/5 stars

### **Technical Performance**
- API response time: <3s (p95)
- Image upload success: >98%
- Duplicate detection accuracy: >95%
- Crash-free rate: >99.9%

### **Business Metrics**
- Items added per user per week: >3
- Conversion to purchase: >20%
- Affiliate revenue per item: >$0.50
- User retention (30-day): >60%

---

## 📝 Implementation Checklist

- [x] Add Item screen with 5 input methods
- [x] Edge Functions for extraction and identification
- [x] Import Preview screen with editable fields
- [x] Image auto-select logic
- [x] Duplicate detection modal
- [x] Supabase Storage integration
- [ ] AI Price Search backend endpoint
- [ ] Smart Search screen with progress UI
- [ ] Price offers display and storage
- [ ] Affiliate link integration
- [ ] Performance optimization
- [ ] Error tracking and analytics

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Status:** ✅ Core flow implemented, AI Price Search in progress
