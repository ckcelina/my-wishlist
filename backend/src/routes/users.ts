import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerUserRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/users/init-defaults - Initialize default wishlist for new users
  app.fastify.post(
    '/api/users/init-defaults',
    {
      schema: {
        description: 'Initialize default wishlist for new user',
        tags: ['users'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Initializing defaults for user');

      try {
        // Check if default wishlist already exists
        const existing = await app.db.query.wishlists.findFirst({
          where: and(
            eq(schema.wishlists.userId, userId),
            eq(schema.wishlists.isDefault, true)
          ),
        });

        if (existing) {
          app.logger.info({ userId }, 'Default wishlist already exists');
          return { success: true };
        }

        // Create default wishlist
        const [defaultWishlist] = await app.db
          .insert(schema.wishlists)
          .values({
            userId,
            name: 'My Wishlist',
            isDefault: true,
          })
          .returning();

        app.logger.info(
          { userId, wishlistId: defaultWishlist.id },
          'Default wishlist created'
        );
        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to create default wishlist'
        );
        throw error;
      }
    }
  );

  // GET /api/users/me - Get current user profile
  app.fastify.get(
    '/api/users/me',
    {
      schema: {
        description: 'Get current user profile',
        tags: ['users'],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching user profile');

      return {
        id: session.user.id,
        name: session.user.name || '',
        email: session.user.email || '',
      };
    }
  );
}
