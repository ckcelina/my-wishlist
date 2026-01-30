import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://dixgmnuayzblwpqyplsi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpeGdtbnVheXpibHdwcXlwbHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTQyMTcsImV4cCI6MjA4NDc3MDIxN30.cxsYejM4zik3AvUEVlQBkUbMqdZ6X2Q4kZ9ISyXrIz4";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
