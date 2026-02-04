
import { Redirect } from 'expo-router';

/**
 * Redirect /wishlists to /lists
 * This ensures backward compatibility with old navigation paths
 */
export default function WishlistsRedirect() {
  return <Redirect href="/(tabs)/lists" />;
}
