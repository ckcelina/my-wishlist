
# Widget Color Scheme Update - Light Mode

## Overview
Updated the iOS widget configuration to reflect the new light mode color scheme for My Wishlist app.

## New Light Mode Colors

### Background & Surfaces
- **Background**: `#EFEFFF` (Light purple background)
- **Surface/Cards**: `#E1E2FC` (Purple-tinted card background)
- **Border**: `rgba(101,45,245,0.15)` (Purple-tinted border with transparency)

### Text Colors
- **Primary Text**: `#2b1f19` (Dark brown for high contrast)
- **Secondary Text**: `rgba(43,31,25,0.70)` (70% opacity for secondary text)

### Accent & Icons
- **Accent/Primary**: `#652DF5` (Vibrant purple for buttons and highlights)
- **Icon Color**: `#5b4f66` (Muted purple for icons)

## Dark Mode Colors (Unchanged)

### Background & Surfaces
- **Background**: `#765943` (Warm brown)
- **Surface/Cards**: `rgba(255,255,255,0.10)` (10% white overlay)
- **Border**: `rgba(255,255,255,0.16)` (16% white border)

### Text Colors
- **Primary Text**: `#FFFFFF` (Pure white)
- **Secondary Text**: `rgba(255,255,255,0.75)` (75% white)

### Accent & Icons
- **Accent/Primary**: `#FFFFFF` (White for contrast)
- **Icon Color**: `#FFFFFF` (White icons)

## Updated Files

### 1. `contexts/WidgetContext.tsx`
- Updated to use new `widgetSync` utility
- Initializes widget with new color scheme on mount
- Provides `refreshWidget` and `updateWidgetData` methods

### 2. `utils/widgetSync.ts` (NEW)
- Centralized widget data synchronization
- Exports `WIDGET_LIGHT_MODE_COLORS` and `WIDGET_DARK_MODE_COLORS`
- Provides `updateWidgetData()`, `refreshWidget()`, and `initializeWidget()` functions
- Syncs color scheme with iOS widget via `ExtensionStorage`

### 3. `app.json`
- Updated `icon` to use new purple logo: `26cf9b07-bf29-4b30-99ac-b91580012793.png`
- Updated `splash.image` to use new purple logo
- Updated `splash.backgroundColor` to `#EFEFFF` (light purple)
- Updated `android.adaptiveIcon.backgroundColor` to `#EFEFFF`
- Updated `web.favicon` to use new purple logo
- Updated `plugins.expo-notifications.icon` to use new purple logo
- Updated `plugins.expo-notifications.color` to `#652DF5` (purple accent)
- Added `extra.widgetColors` configuration with light and dark mode color schemes

## Widget Data Structure

The widget receives data in the following format:

```typescript
interface WidgetData {
  wishlists: {
    id: string;
    name: string;
    itemCount: number;
    recentItems: {
      id: string;
      title: string;
      imageUrl: string | null;
      currentPrice: number | null;
      currency: string;
    }[];
  }[];
  colorScheme: {
    light: {
      background: string;
      surface: string;
      accent: string;
      textPrimary: string;
      textSecondary: string;
      border: string;
      icon: string;
    };
    dark: {
      background: string;
      surface: string;
      accent: string;
      textPrimary: string;
      textSecondary: string;
      border: string;
      icon: string;
    };
  };
  appIcon: string;
  lastUpdated: string;
}
```

## Usage

### Updating Widget Data
```typescript
import { useWidget } from '@/contexts/WidgetContext';

function MyComponent() {
  const { updateWidgetData } = useWidget();
  
  // Update widget with wishlist data
  await updateWidgetData([
    {
      id: '123',
      name: 'My Wishlist',
      itemCount: 5,
      recentItems: [
        {
          id: '1',
          title: 'Product Name',
          imageUrl: 'https://...',
          currentPrice: 29.99,
          currency: 'USD',
        },
      ],
    },
  ]);
}
```

### Refreshing Widget
```typescript
import { useWidget } from '@/contexts/WidgetContext';

function MyComponent() {
  const { refreshWidget } = useWidget();
  
  // Refresh widget to reload with latest data
  refreshWidget();
}
```

## Native Widget Implementation

The native iOS widget (Swift code) should read the color scheme from the shared `ExtensionStorage`:

```swift
// In your iOS Widget Swift code
if let widgetDataString = UserDefaults(suiteName: "group.com.anonymous.MyWishlist")?.string(forKey: "widget_data"),
   let widgetData = try? JSONDecoder().decode(WidgetData.self, from: Data(widgetDataString.utf8)) {
    
    // Use light mode colors
    let backgroundColor = Color(hex: widgetData.colorScheme.light.background)
    let surfaceColor = Color(hex: widgetData.colorScheme.light.surface)
    let accentColor = Color(hex: widgetData.colorScheme.light.accent)
    let textColor = Color(hex: widgetData.colorScheme.light.textPrimary)
    
    // Or use dark mode colors based on environment
    @Environment(\.colorScheme) var colorScheme
    let colors = colorScheme == .dark ? widgetData.colorScheme.dark : widgetData.colorScheme.light
}
```

## Testing

1. **Verify Color Sync**: Check that `widget_data` in `ExtensionStorage` contains the new color scheme
2. **Test Light Mode**: Ensure widget displays with purple background (#EFEFFF) in light mode
3. **Test Dark Mode**: Ensure widget displays with brown background (#765943) in dark mode
4. **Test Icon**: Verify new purple gift box logo appears in widget
5. **Test Data Updates**: Confirm wishlist data updates reflect in widget

## Notes

- The widget uses `@bacons/apple-targets` for iOS widget communication
- Color scheme is automatically synced when app launches via `WidgetProvider`
- Widget data is stored in shared `UserDefaults` group: `group.com.anonymous.MyWishlist`
- Widget automatically reloads when data is updated via `ExtensionStorage.reloadWidget()`

## Consistency with App Theme

The widget color scheme is kept in sync with the main app theme defined in:
- `styles/theme.ts` - Main theme definitions
- `constants/Colors.ts` - Color constants

Any changes to the app's color scheme should also be reflected in:
- `utils/widgetSync.ts` - Widget color constants
- `app.json` - Widget configuration in `extra.widgetColors`
