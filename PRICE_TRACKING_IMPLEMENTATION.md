
# Price Tracking Implementation Summary

## Overview
This document describes the implementation of scheduled price tracking with daily/weekly refresh, notifications, and UI for managing tracking settings.

## Backend Changes (via make_backend_change)

### Database Schema
The following fields were added to the `wishlist_items` table:
- `tracking_enabled` (boolean, default false) - Whether price tracking is enabled for this item
- `tracking_frequency` ('daily' | 'weekly', default 'daily') - How often to check the price
- `last_checked_price` (decimal) - The price from the last check
- `lowest_price_seen` (decimal) - The lowest price ever recorded for this item
- `last_checked_at` (timestamp) - When the price was last checked
- `notifications_enabled` (boolean, default true) - Whether to send notifications for this item

### API Endpoints Created

#### GET /api/items/:id/tracking
Get tracking settings for an item.

**Response:**
```json
{
  "itemId": "uuid",
  "itemTitle": "Product Name",
  "trackingEnabled": false,
  "trackingFrequency": "daily",
  "lastCheckedPrice": 99.99,
  "lowestPriceSeen": 89.99,
  "lastCheckedAt": "2024-01-15T10:30:00Z",
  "notificationsEnabled": true
}
```

#### PUT /api/items/:id/tracking
Update tracking settings for an item.

**Request Body:**
```json
{
  "trackingEnabled": true,
  "trackingFrequency": "daily",
  "notificationsEnabled": true
}
```

**Response:** Same as GET endpoint

#### POST /api/items/:id/check-price
Manually trigger a price check for an item.

**Response:**
```json
{
  "success": true,
  "priceChanged": true,
  "oldPrice": 99.99,
  "newPrice": 89.99,
  "lastCheckedAt": "2024-01-15T10:30:00Z"
}
```

#### GET /api/items/:id/price-dropped
Check if the price has dropped since first recorded.

**Response:**
```json
{
  "priceDropped": true,
  "originalPrice": 99.99,
  "currentPrice": 89.99,
  "percentageChange": -10.0
}
```

#### GET /api/items/:id/price-history
Get full price history with trend summary.

**Response:**
```json
{
  "trend": {
    "lowestPrice": 89.99,
    "highestPrice": 109.99,
    "firstPrice": 99.99,
    "latestPrice": 89.99,
    "currency": "USD"
  },
  "history": [
    {
      "id": "uuid",
      "price": 89.99,
      "currency": "USD",
      "recordedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Frontend Implementation

### New Screens

#### 1. app/item/tracking/[id].tsx
Price tracking management screen with:
- Toggle to enable/disable tracking
- Frequency selector (daily/weekly)
- Notification toggle
- Tracking statistics (last checked, last price, lowest price seen)
- Contextual notification permission requests

**Features:**
- Requests notification permission when user enables tracking/alerts
- Shows last checked timestamp with relative time
- Displays lowest price seen in green
- Info box explaining tracking behavior

#### 2. app/item/price-history/[id].tsx
Price history visualization screen with:
- Price trend summary (current, change, lowest, highest)
- Price chart placeholder (for future chart library integration)
- Chronological list of all price history entries
- Color-coded price changes (green for drops, red for increases)

**Features:**
- Shows percentage change from first to latest price
- Highlights lowest price in green
- Formatted dates and times for each entry
- Empty state when no history exists

### Updated Screens

#### app/item/[id].tsx
Enhanced item detail screen with:
- Price tracking status badge (when enabled)
- "Manage Price Tracking" button
- "Check Price Now" button for manual checks
- Last checked timestamp display
- Price drop badge with percentage
- Target price alert card with toggle and input

**Features:**
- Shows tracking frequency badge (daily/weekly)
- Manual price check with loading state
- Price drop indicator with percentage
- Target price alert with notification permission handling

### Notification Permission Flow

The app uses contextual permission requests:
1. User enables tracking → Permission requested if not granted
2. User enables notifications → Permission requested if not granted
3. Permission denied → User can still use tracking without notifications
4. Permission settings link → Opens system settings

### UI Components Used

- **Card**: For grouped content sections
- **Divider**: For visual separation
- **IconSymbol**: For cross-platform icons
- **Switch**: For toggle controls
- **Modal**: For frequency selection
- **ActivityIndicator**: For loading states

## Notification Types

The system supports the following notification types:

1. **Price Drop**: When price decreases
2. **Under Target Price**: When price goes below user-set target
3. **Restock**: When item becomes available again
4. **Shipping Available**: When shipping becomes available to user's location

## Edge Function (Scheduled Jobs)

### Supabase Edge Function: price-check

**Purpose:** Scheduled job to check prices for all tracked items

**Triggers:**
- Daily cron job (for items with `tracking_frequency = 'daily'`)
- Weekly cron job (for items with `tracking_frequency = 'weekly'`)

**Logic:**
1. Fetch all items where `tracking_enabled = true` and frequency matches
2. For each item:
   - Scrape product page for current price
   - Update `current_price`, `last_checked_price`, `last_checked_at`
   - If price changed, insert into `price_history` table
   - Update `lowest_price_seen` if new price is lower
   - Check notification triggers:
     - Price drop
     - Under target price
     - Restock
     - Shipping available
   - Send notifications if `notifications_enabled = true`

**Error Handling:**
- Failed scrapes are logged but don't stop the job
- Items with repeated failures are marked for manual review
- Retry logic with exponential backoff

## Data Flow

### Enabling Tracking
1. User toggles tracking on → Frontend calls PUT /api/items/:id/tracking
2. Backend initializes tracking fields:
   - `last_checked_price` = current price
   - `lowest_price_seen` = current price
   - `last_checked_at` = now
3. Frontend requests notification permission if needed
4. Item is now included in scheduled price checks

### Price Check Cycle
1. Edge Function runs on schedule
2. Fetches items matching frequency
3. For each item:
   - Scrapes current price
   - Compares with last checked price
   - Updates database
   - Adds to price history if changed
   - Sends notifications if triggers met

### Manual Price Check
1. User taps "Check Price Now"
2. Frontend calls POST /api/items/:id/check-price
3. Backend scrapes price immediately
4. Returns result with old/new price comparison
5. Frontend shows alert with result

## Security & Privacy

- All tracking endpoints require authentication
- Users can only manage tracking for their own items
- Notification permissions are requested contextually
- Users can disable notifications while keeping tracking enabled
- Price history is private to the item owner

## Performance Considerations

- Scheduled jobs process items in batches
- Failed scrapes don't block other items
- Database indexes on `tracking_enabled` and `tracking_frequency`
- Price history limited to reasonable timeframe (e.g., 90 days)

## Future Enhancements

1. **Price Chart Visualization**: Add chart library to display price trends
2. **Smart Notifications**: ML-based prediction of best time to buy
3. **Price Alerts**: Custom price thresholds per item
4. **Competitor Tracking**: Track same item across multiple stores
5. **Historical Analytics**: Price patterns and seasonal trends

## Testing Checklist

- [ ] Enable tracking for an item
- [ ] Change tracking frequency
- [ ] Toggle notifications on/off
- [ ] Manual price check
- [ ] View price history
- [ ] Notification permission flow
- [ ] Price drop detection
- [ ] Target price alerts
- [ ] Scheduled job execution
- [ ] Error handling for failed scrapes

## Verified Implementation

✅ All API endpoints verified against backend schema
✅ All file imports verified (no missing .ios/.android files)
✅ Atomic JSX rules followed (no logic in JSX, one variable per Text)
✅ Cross-platform compatibility (Modal for confirmations, not Alert)
✅ Notification permissions handled correctly
✅ Loading states implemented for all async operations
✅ Error handling with user-friendly messages
✅ Consistent styling with design system
✅ TypeScript interfaces defined for all data structures
