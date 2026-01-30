
# Backend Requirements for Price Tracking & Location Features

## Database Schema Updates

### 1. Update `user_alert_settings` table
Add new columns to support enhanced alert settings:

```sql
ALTER TABLE user_alert_settings 
ADD COLUMN price_drop_threshold_type TEXT DEFAULT 'any' CHECK (price_drop_threshold_type IN ('any', 'percentage', 'amount')),
ADD COLUMN price_drop_threshold_value DECIMAL(10, 2),
ADD COLUMN check_frequency TEXT DEFAULT 'daily' CHECK (check_frequency IN ('daily', 'twice_daily', 'hourly')),
ADD COLUMN preferred_stores TEXT[], -- Array of store domains
ADD COLUMN preferred_currency TEXT DEFAULT 'USD';
```

### 2. Create `price_offers` table
Store alternative price offers from AI Price Search:

```sql
CREATE TABLE price_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES wishlist_items(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_domain TEXT NOT NULL,
  product_url TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  original_price DECIMAL(10, 2),
  original_currency TEXT,
  normalized_price DECIMAL(10, 2) NOT NULL,
  normalized_currency TEXT NOT NULL,
  shipping_cost DECIMAL(10, 2),
  delivery_time TEXT,
  availability TEXT CHECK (availability IN ('in_stock', 'out_of_stock', 'limited_stock', 'unknown')),
  confidence_score DECIMAL(3, 2),
  variant_details JSONB,
  country_code TEXT NOT NULL,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX price_offers_item_id_idx ON price_offers(item_id);
CREATE INDEX price_offers_country_code_idx ON price_offers(country_code);
```

## API Endpoints to Update/Create

### 1. **GET /api/alert-settings**
Update response to include new fields:
```typescript
{
  userId: string;
  alertsEnabled: boolean;
  notifyPriceDrops: boolean;
  notifyUnderTarget: boolean;
  weeklyDigest: boolean;
  quietHoursEnabled: boolean;
  quietStart: string | null;
  quietEnd: string | null;
  priceDropThresholdType: 'any' | 'percentage' | 'amount';
  priceDropThresholdValue: number | null;
  checkFrequency: 'daily' | 'twice_daily' | 'hourly';
  preferredStores: string[];
  preferredCurrency: string;
  updatedAt: string;
}
```

### 2. **PUT /api/alert-settings**
Accept new fields in request body and update database.

### 3. **POST /api/items/:id/save-offers**
New endpoint to save price offers from AI Price Search:
```typescript
Request Body: {
  offers: Array<{
    storeName: string;
    storeDomain: string;
    productUrl: string;
    price: number;
    currency: string;
    originalPrice?: number;
    originalCurrency?: string;
    shippingCost?: number;
    deliveryTime?: string;
    availability?: string;
    confidenceScore?: number;
    countryCode: string;
    city?: string;
  }>;
}

Response: {
  success: boolean;
  savedCount: number;
}
```

### 4. **POST /api/items/ai-price-search**
Update to require and use location data:
```typescript
Request Body: {
  productName: string;
  imageUrl?: string;
  originalUrl?: string;
  countryCode: string; // REQUIRED
  city?: string;
}

Response: {
  offers: Array<AlternativeStore>;
  message?: string;
}
```

## Background Jobs / Cron Tasks

### 1. **Price Tracking Job**
Create a scheduled job that runs based on user's `check_frequency` setting:

**Frequency Options:**
- `daily`: Run once per day (e.g., 9 AM UTC)
- `twice_daily`: Run every 12 hours (e.g., 9 AM and 9 PM UTC)
- `hourly`: Run every hour (Premium users only)

**Job Logic:**
1. Fetch all items with `alert_enabled = true` OR users with `notify_price_drops = true`
2. For each item with `original_url`:
   - Fetch current price from the URL
   - Compare with `current_price` in database
   - If price changed:
     - Insert new entry in `price_history` table
     - Update `current_price` and `last_checked_at` in `wishlist_items`
     - Check if alert should be triggered (see Alert Trigger Logic below)

### 2. **Alert Trigger Logic**
When a price changes, determine if an alert should be sent:

```typescript
function shouldTriggerAlert(
  oldPrice: number,
  newPrice: number,
  alertSettings: AlertSettings,
  itemAlertPrice: number | null
): boolean {
  // Check if alerts are enabled
  if (!alertSettings.alertsEnabled) return false;
  
  // Check quiet hours
  if (alertSettings.quietHoursEnabled && isInQuietHours(alertSettings.quietStart, alertSettings.quietEnd)) {
    return false;
  }
  
  // Check if price dropped
  if (newPrice >= oldPrice) return false;
  
  // Check threshold
  if (alertSettings.priceDropThresholdType === 'percentage') {
    const percentDrop = ((oldPrice - newPrice) / oldPrice) * 100;
    if (percentDrop < (alertSettings.priceDropThresholdValue || 0)) return false;
  } else if (alertSettings.priceDropThresholdType === 'amount') {
    const amountDrop = oldPrice - newPrice;
    if (amountDrop < (alertSettings.priceDropThresholdValue || 0)) return false;
  }
  // 'any' type always triggers on any drop
  
  // Check target price alert
  if (alertSettings.notifyUnderTarget && itemAlertPrice && newPrice <= itemAlertPrice) {
    return true;
  }
  
  // Check price drop alert
  if (alertSettings.notifyPriceDrops) {
    return true;
  }
  
  return false;
}
```

### 3. **Notification Deduplication**
Use the existing `notification_dedupe` table to prevent spam:
- Only send one notification per item per 24 hours for price drops
- Only send one target price alert per item (until price goes back up)

### 4. **Weekly Digest Job**
If `weeklyDigest = true`, send a summary email/push notification every Sunday:
- List all items with price drops in the past week
- Show percentage/amount saved
- Include links to items

## Location Integration

### 1. **Require Location for Price Search**
All price search endpoints must validate that user has set their location:

```typescript
// In /api/items/ai-price-search
if (!countryCode) {
  return reply.status(400).send({
    error: 'LOCATION_REQUIRED',
    message: 'Please set your shipping location to search for prices',
  });
}
```

### 2. **Filter Stores by Location**
When returning price offers:
- Only include stores that ship to user's country
- If city is provided, filter by city-level shipping rules
- Mark unavailable stores with reason codes

### 3. **Store Location in All Price Data**
When saving price offers or price history:
- Always include `country_code` and `city` (if available)
- This allows historical tracking of price availability by region

## Implementation Priority

1. ✅ **High Priority** (Required for MVP):
   - Update `user_alert_settings` table schema
   - Update GET/PUT `/api/alert-settings` endpoints
   - Create `/api/items/:id/save-offers` endpoint
   - Update `/api/items/ai-price-search` to require location
   - Create `price_offers` table

2. 🔄 **Medium Priority** (Core Features):
   - Implement daily price tracking job
   - Implement alert trigger logic
   - Add notification deduplication
   - Create background worker for price checks

3. 📊 **Low Priority** (Nice to Have):
   - Twice daily and hourly frequency options
   - Weekly digest emails
   - Preferred stores filtering
   - Advanced threshold options

## Testing Checklist

- [ ] User can set alert threshold (any/percentage/amount)
- [ ] User can set check frequency (daily/twice_daily/hourly)
- [ ] User can set preferred currency
- [ ] Location is required for AI Price Search
- [ ] Price offers are saved to database
- [ ] Price tracking job runs on schedule
- [ ] Alerts are triggered based on threshold settings
- [ ] Quiet hours are respected
- [ ] Notifications are deduplicated
- [ ] Weekly digest is sent (if enabled)
- [ ] All settings persist across sessions
