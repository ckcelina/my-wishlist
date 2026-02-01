

import { ExtensionStorage } from "@bacons/apple-targets";

// Light mode color scheme for widget (matches styles/theme.ts)
export const WIDGET_LIGHT_MODE_COLORS = {
  background: '#EFEFFF',
  surface: '#E1E2FC',
  accent: '#652DF5',
  textPrimary: '#2b1f19',
  textSecondary: 'rgba(43,31,25,0.70)',
  border: 'rgba(101,45,245,0.15)',
  icon: '#5b4f66',
};

// Dark mode color scheme for widget (matches styles/theme.ts)
export const WIDGET_DARK_MODE_COLORS = {
  background: '#765943',
  surface: 'rgba(255,255,255,0.10)',
  accent: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.75)',
  border: 'rgba(255,255,255,0.16)',
  icon: '#FFFFFF',
};

export interface WidgetWishlistItem {
  id: string;
  title: string;
  imageUrl: string | null;
  currentPrice: number | null;
  currency: string;
}

export interface WidgetData {
  wishlists: {
    id: string;
    name: string;
    itemCount: number;
    recentItems: WidgetWishlistItem[];
  }[];
  colorScheme: {
    light: typeof WIDGET_LIGHT_MODE_COLORS;
    dark: typeof WIDGET_DARK_MODE_COLORS;
  };
  appIcon: string;
  lastUpdated: string;
}

const storage = new ExtensionStorage("group.com.anonymous.MyWishlist");

/**
 * Update widget data with wishlist information and color scheme
 */
export async function updateWidgetData(wishlists: WidgetData['wishlists']): Promise<void> {
  try {
    const widgetData: WidgetData = {
      wishlists,
      colorScheme: {
        light: WIDGET_LIGHT_MODE_COLORS,
        dark: WIDGET_DARK_MODE_COLORS,
      },
      appIcon: 'assets/images/6c7b263c-7920-4d07-94f3-fac6c2f0b3c0.png',
      lastUpdated: new Date().toISOString(),
    };

    console.log('Updating widget data with new color scheme:', widgetData);
    
    storage.set("widget_data", JSON.stringify(widgetData));
    ExtensionStorage.reloadWidget();
    
    console.log('Widget data updated successfully');
  } catch (error) {
    console.error('Failed to update widget data:', error);
  }
}

/**
 * Refresh widget with current color scheme
 */
export function refreshWidget(): void {
  try {
    console.log('Refreshing widget with updated color scheme');
    ExtensionStorage.reloadWidget();
  } catch (error) {
    console.error('Failed to refresh widget:', error);
  }
}

/**
 * Initialize widget with color scheme configuration
 */
export function initializeWidget(): void {
  try {
    const config = {
      lightModeColors: WIDGET_LIGHT_MODE_COLORS,
      darkModeColors: WIDGET_DARK_MODE_COLORS,
      appIcon: 'assets/images/6c7b263c-7920-4d07-94f3-fac6c2f0b3c0.png',
    };
    
    console.log('Initializing widget with color scheme:', config);
    
    storage.set("widget_config", JSON.stringify(config));
    ExtensionStorage.reloadWidget();
    
    console.log('Widget initialized successfully');
  } catch (error) {
    console.error('Failed to initialize widget:', error);
  }
}

