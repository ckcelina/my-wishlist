
import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { 
  updateWidgetData as syncWidgetData, 
  refreshWidget as reloadWidget,
  initializeWidget,
  WidgetData,
} from "@/utils/widgetSync";

type WidgetContextType = {
  refreshWidget: () => void;
  updateWidgetData: (wishlists: WidgetData['wishlists']) => Promise<void>;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  // Initialize widget with new color scheme on mount
  React.useEffect(() => {
    console.log('Initializing widget with new light mode color scheme');
    initializeWidget();
  }, []);

  const refreshWidget = useCallback(() => {
    console.log('Refreshing widget with new color scheme');
    reloadWidget();
  }, []);

  const updateWidgetData = useCallback(async (wishlists: WidgetData['wishlists']) => {
    console.log('Updating widget data with wishlists:', wishlists.length);
    await syncWidgetData(wishlists);
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget, updateWidgetData }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
