
# Add Item E2E Test Guide

## Quick Start

### Running the Automated Test

1. **Navigate to the test screen:**
   ```
   /add-item-e2e-test
   ```

2. **Tap "Run All Tests"**

3. **Review results:**
   - ✅ Green = Pass
   - ❌ Red = Fail
   - ⏱️ Yellow = Pending
   - ⊖ Gray = Skipped

---

## Manual Testing Checklist

### Prerequisites

Before testing, ensure:
- [ ] User is logged in
- [ ] Country is set in Settings (`/location`)
- [ ] Camera permission granted (or will be requested)
- [ ] Photo library permission granted (or will be requested)

---

### Test 1: Add Tab Opens

**Steps:**
1. Navigate to Add tab from any screen
2. Verify screen loads without crashes

**Expected:**
- Add screen displays with 6 mode tabs
- Wishlist selector shows at top
- Country warning shows if not set

**Pass Criteria:**
- ✅ No crashes
- ✅ All UI elements visible
- ✅ Mode tabs are tappable

---

### Test 2: URL Mode

**Steps:**
1. Select "URL" tab
2. Paste a product URL (e.g., `https://www.amazon.com/dp/B08N5WRWNW`)
3. Tap "Extract Item Details"
4. Wait for extraction to complete
5. Verify Import Preview screen shows extracted data
6. Edit any fields if needed
7. Toggle "This is the correct product"
8. Tap "Confirm & Add"
9. Navigate to wishlist and verify item appears

**Expected:**
- Extraction completes within 5-10 seconds
- Import Preview shows: title, image, price, store
- Item saves to selected wishlist
- Default wishlist remains unchanged

**Pass Criteria:**
- ✅ URL validation works
- ✅ Country check enforced
- ✅ Extraction returns data
- ✅ Import Preview displays correctly
- ✅ Item saves successfully
- ✅ Default wishlist unchanged

**Fallback Test:**
- If extraction fails, verify "Add Manually" option works

---

### Test 3: Camera Mode

**Steps:**
1. Select "Camera" tab
2. Tap "Take Photo"
3. Grant camera permission if prompted
4. Take a photo of a product
5. Tap "Identify Product"
6. Wait for identification to complete
7. Verify "Find Matches" button appears
8. Tap "Find Matches"
9. Select a product match from the list
10. Verify prices load from multiple stores
11. Toggle "This is the correct product"
12. Tap "Confirm & Add"
13. Navigate to wishlist and verify item appears

**Expected:**
- Camera opens successfully
- Photo is captured and displayed
- Identification completes within 5-10 seconds
- Product matches show with images
- Prices load and display (sorted cheapest first)
- Item saves with all offers

**Pass Criteria:**
- ✅ Camera permission works
- ✅ Photo capture works
- ✅ Image upload to Supabase Storage works
- ✅ Product identification returns matches
- ✅ Match selection triggers price fetch
- ✅ Prices display correctly
- ✅ Item saves successfully
- ✅ Default wishlist unchanged

**Fallback Test:**
- If no matches found, verify "Try Another Photo" and "Manual Entry" options work

---

### Test 4: Upload Mode

**Steps:**
1. Select "Upload" tab
2. Tap "Choose from Gallery"
3. Grant photo library permission if prompted
4. Select an image of a product
5. Tap "Identify Product"
6. Wait for identification to complete
7. Verify "Find Matches" button appears
8. Tap "Find Matches"
9. Select a product match from the list
10. Verify prices load from multiple stores
11. Toggle "This is the correct product"
12. Tap "Confirm & Add"
13. Navigate to wishlist and verify item appears

**Expected:**
- Photo library opens successfully
- Image is selected and displayed
- Identification completes within 5-10 seconds
- Product matches show with images
- Prices load and display (sorted cheapest first)
- Item saves with all offers

**Pass Criteria:**
- ✅ Photo library permission works
- ✅ Image selection works
- ✅ Image upload to Supabase Storage works
- ✅ Product identification returns matches
- ✅ Match selection triggers price fetch
- ✅ Prices display correctly
- ✅ Item saves successfully
- ✅ Default wishlist unchanged

**Fallback Test:**
- If no matches found, verify "Try Another Photo" and "Manual Entry" options work

---

### Test 5: Search Mode

**Steps:**
1. Select "Search" tab
2. Enter a product name (e.g., "iPhone 15 Pro")
3. Tap "Search"
4. Wait for search results to load
5. Select a result from the list
6. Verify Import Preview screen shows product details
7. Edit any fields if needed
8. Toggle "This is the correct product"
9. Tap "Confirm & Add"
10. Navigate to wishlist and verify item appears

**Expected:**
- Search completes within 5-10 seconds
- Results show with images and prices
- Import Preview displays selected result
- Item saves to selected wishlist

**Pass Criteria:**
- ✅ Search query validation works
- ✅ Country check enforced
- ✅ Search returns results
- ✅ Result selection navigates to Import Preview
- ✅ Item saves successfully
- ✅ Default wishlist unchanged

**Fallback Test:**
- If no results found, verify "Try different search or add manually" option works

---

### Test 6: Manual Mode

**Steps:**
1. Select "Manual" tab
2. Enter item name (required)
3. Optionally enter brand, store link, price, currency
4. Optionally upload an image
5. Optionally add notes
6. Tap "Continue to Preview"
7. Verify Import Preview screen shows entered data
8. Toggle "This is the correct product"
9. Tap "Confirm & Add"
10. Navigate to wishlist and verify item appears

**Expected:**
- All input fields work correctly
- Image upload works (optional)
- Currency picker works
- Import Preview displays entered data
- Item saves to selected wishlist

**Pass Criteria:**
- ✅ Input validation works (item name required)
- ✅ Image upload works
- ✅ Currency picker works
- ✅ Import Preview displays correctly
- ✅ Item saves successfully
- ✅ Default wishlist unchanged

---

### Test 7: Default Wishlist Verification

**Steps:**
1. Create a new wishlist (not default)
2. Add an item to the new wishlist using any mode
3. Navigate to Lists screen
4. Verify default wishlist is still marked as default
5. Navigate to the new wishlist
6. Verify the item appears in the new wishlist

**Expected:**
- Item appears in selected wishlist
- Default wishlist remains unchanged
- Default badge only shows on default wishlist

**Pass Criteria:**
- ✅ Item saves to correct wishlist
- ✅ Default wishlist unchanged
- ✅ Default badge only on default wishlist

---

## Edge Cases to Test

### 1. No Country Set

**Steps:**
1. Go to Settings → Location
2. Clear country selection
3. Try to use URL, Camera, Upload, or Search mode
4. Verify warning banner shows
5. Tap "Go to Settings"
6. Verify navigation to Location screen

**Expected:**
- Warning banner shows: "Country not set"
- "Go to Settings" button works
- User cannot proceed without setting country

---

### 2. Permission Denied

**Steps:**
1. Deny camera permission
2. Try to use Camera mode
3. Verify alert shows with "Open Settings" button
4. Deny photo library permission
5. Try to use Upload mode
6. Verify alert shows with "Open Settings" button

**Expected:**
- Alert shows: "Permission Required"
- "Open Settings" button opens iOS Settings
- User cannot proceed without granting permission

---

### 3. Extraction Fails

**Steps:**
1. Use URL mode with an invalid or unsupported URL
2. Wait for extraction to fail
3. Verify alert shows with "Add Manually" option
4. Tap "Add Manually"
5. Verify navigation to Import Preview with URL attached

**Expected:**
- Alert shows: "Extraction Failed"
- "Add Manually" option works
- User can still add item manually

---

### 4. No Matches Found

**Steps:**
1. Use Camera or Upload mode with an obscure product
2. Tap "Find Matches"
3. Wait for identification to complete
4. Verify alert shows with "Try Another Photo" and "Manual Entry" options

**Expected:**
- Alert shows: "No Matches Found"
- "Try Another Photo" option works
- "Manual Entry" option works

---

### 5. Duplicate Detection

**Steps:**
1. Add an item to a wishlist
2. Try to add the same item again (same URL or similar title)
3. Verify duplicate detection modal shows
4. Test all options: "Add Anyway", "Replace", "Cancel"

**Expected:**
- Duplicate modal shows with similar items
- "Add Anyway" adds duplicate
- "Replace" option shows (not yet implemented)
- "Cancel" cancels the operation

---

## Performance Benchmarks

| Operation | Expected Duration | Acceptable Range |
|-----------|------------------|------------------|
| URL Extraction | 3-5 seconds | 2-10 seconds |
| Image Identification | 5-10 seconds | 3-15 seconds |
| Product Search | 3-5 seconds | 2-10 seconds |
| Price Fetch | 2-5 seconds | 1-10 seconds |
| Image Upload | 1-3 seconds | 1-5 seconds |
| Item Save | <1 second | <2 seconds |

---

## Troubleshooting

### Issue: "Country Required" alert keeps showing

**Solution:**
1. Go to Settings → Location
2. Select a country
3. Verify country is saved
4. Return to Add screen

---

### Issue: Camera/Photo library permission denied

**Solution:**
1. Open iOS Settings
2. Find "My Wishlist" app
3. Enable Camera/Photos permission
4. Return to app

---

### Issue: "No matches found" for common products

**Solution:**
1. Try a different photo (better lighting, clearer angle)
2. Use Search mode instead
3. Use Manual mode as fallback

---

### Issue: Extraction fails for valid URL

**Solution:**
1. Check internet connection
2. Verify URL is from a supported store
3. Use Manual mode as fallback

---

### Issue: Item doesn't appear in wishlist

**Solution:**
1. Check if correct wishlist was selected
2. Refresh the wishlist screen
3. Check if item was saved (check database)

---

## Reporting Issues

When reporting issues, include:
1. **Test name** (e.g., "Test 3: Camera Mode")
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Screenshots** (if applicable)
6. **Device info** (iOS version, device model)
7. **Console logs** (use `read_frontend_logs`)

---

## Success Criteria

All tests must pass with:
- ✅ No crashes
- ✅ No infinite loops
- ✅ No blank screens
- ✅ All UI elements visible and functional
- ✅ All navigation works correctly
- ✅ All data saves correctly
- ✅ Default wishlist remains unchanged
- ✅ Error handling works gracefully
- ✅ Fallback options work when AI fails

---

## Conclusion

This E2E test guide ensures comprehensive coverage of all Add Item flows. Follow the manual testing checklist to verify functionality on physical devices.

For automated testing, use the `/add-item-e2e-test` screen to run all tests programmatically.
