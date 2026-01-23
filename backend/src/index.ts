import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerUserRoutes } from './routes/users.js';
import { registerWishlistRoutes } from './routes/wishlists.js';
import { registerItemRoutes } from './routes/items.js';

// Combine schemas for full database type support
const schema = { ...appSchema, ...authSchema };

// Create application with combined schema
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable Better Auth for user authentication
app.withAuth();

// Register all route modules
registerUserRoutes(app);
registerWishlistRoutes(app);
registerItemRoutes(app);

await app.run();
app.logger.info('Application running');
