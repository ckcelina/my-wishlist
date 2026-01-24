
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, typography } from '@/styles/designSystem';

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    console.log('[AuthCallback] Handling OAuth callback');
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      // Get the current session after OAuth redirect
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[AuthCallback] Error getting session:', error);
        router.replace('/auth');
        return;
      }

      if (session) {
        console.log('[AuthCallback] OAuth successful, user:', session.user.id);
        
        // Check if user has wishlists
        const { data: wishlists, error: wishlistError } = await supabase
          .from('wishlists')
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1);
        
        if (wishlistError) {
          console.error('[AuthCallback] Error checking wishlists:', wishlistError);
        }

        if (!wishlists || wishlists.length === 0) {
          // Create default wishlist for new OAuth users
          console.log('[AuthCallback] Creating default wishlist for new user');
          const { data: newWishlist, error: createError } = await supabase
            .from('wishlists')
            .insert({
              user_id: session.user.id,
              name: 'My Wishlist',
            })
            .select()
            .single();
          
          if (createError) {
            console.error('[AuthCallback] Error creating wishlist:', createError);
            router.replace('/(tabs)/wishlists');
          } else {
            console.log('[AuthCallback] Navigating to new wishlist:', newWishlist.id);
            router.replace(`/wishlist/${newWishlist.id}`);
          }
        } else {
          console.log('[AuthCallback] Navigating to wishlists');
          router.replace('/(tabs)/wishlists');
        }
      } else {
        console.log('[AuthCallback] No session found, redirecting to auth');
        router.replace('/auth');
      }
    } catch (error) {
      console.error('[AuthCallback] OAuth callback error:', error);
      router.replace('/auth');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    ...typography.bodyLarge,
    marginTop: 16,
    color: colors.textSecondary,
  },
});
