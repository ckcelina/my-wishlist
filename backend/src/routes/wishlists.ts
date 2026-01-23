import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, count, isNull } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerWishlistRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/wishlists - List all wishlists for authenticated user
  app.fastify.get(
    '/api/wishlists',
    {
      schema: {
        description: 'Get all wishlists for the authenticated user',
        tags: ['wishlists'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                isDefault: { type: 'boolean' },
                itemCount: { type: 'number' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Fetching wishlists');

      const userWishlists = await app.db
        .select({
          id: schema.wishlists.id,
          name: schema.wishlists.name,
          isDefault: schema.wishlists.isDefault,
          createdAt: schema.wishlists.createdAt,
        })
        .from(schema.wishlists)
        .where(eq(schema.wishlists.userId, userId));

      // Add item count for each wishlist
      const wishlistsWithCounts = await Promise.all(
        userWishlists.map(async (wishlist) => {
          const [result] = await app.db
            .select({ count: count() })
            .from(schema.items)
            .where(eq(schema.items.wishlistId, wishlist.id));

          return {
            ...wishlist,
            itemCount: result?.count || 0,
          };
        })
      );

      app.logger.info(
        { userId, count: wishlistsWithCounts.length },
        'Wishlists fetched successfully'
      );
      return wishlistsWithCounts;
    }
  );

  // POST /api/wishlists - Create a new wishlist
  app.fastify.post(
    '/api/wishlists',
    {
      schema: {
        description: 'Create a new wishlist',
        tags: ['wishlists'],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              isDefault: { type: 'boolean' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { name: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { name } = request.body;

      app.logger.info({ userId, name }, 'Creating wishlist');

      const [newWishlist] = await app.db
        .insert(schema.wishlists)
        .values({
          userId,
          name,
          isDefault: false,
        })
        .returning();

      app.logger.info({ wishlistId: newWishlist.id, name }, 'Wishlist created');

      reply.status(201);
      return newWishlist;
    }
  );

  // PUT /api/wishlists/:id - Update a wishlist
  app.fastify.put(
    '/api/wishlists/:id',
    {
      schema: {
        description: 'Update a wishlist',
        tags: ['wishlists'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              isDefault: { type: 'boolean' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { name: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;
      const { name } = request.body;

      app.logger.info({ wishlistId: id, userId, name }, 'Updating wishlist');

      // Verify ownership
      const wishlist = await app.db.query.wishlists.findFirst({
        where: eq(schema.wishlists.id, id),
      });

      if (!wishlist || wishlist.userId !== userId) {
        app.logger.warn({ wishlistId: id, userId }, 'Wishlist not found');
        return reply.status(404).send({ error: 'Wishlist not found' });
      }

      const [updated] = await app.db
        .update(schema.wishlists)
        .set({ name })
        .where(eq(schema.wishlists.id, id))
        .returning();

      app.logger.info({ wishlistId: id, name }, 'Wishlist updated');
      return updated;
    }
  );

  // DELETE /api/wishlists/:id - Delete a wishlist
  app.fastify.delete(
    '/api/wishlists/:id',
    {
      schema: {
        description: 'Delete a wishlist',
        tags: ['wishlists'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
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
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;

      app.logger.info({ wishlistId: id, userId }, 'Deleting wishlist');

      // Verify ownership
      const wishlist = await app.db.query.wishlists.findFirst({
        where: eq(schema.wishlists.id, id),
      });

      if (!wishlist || wishlist.userId !== userId) {
        app.logger.warn({ wishlistId: id, userId }, 'Wishlist not found');
        return reply.status(404).send({ error: 'Wishlist not found' });
      }

      await app.db.delete(schema.wishlists).where(eq(schema.wishlists.id, id));

      app.logger.info({ wishlistId: id }, 'Wishlist deleted');
      return { success: true };
    }
  );

  // GET /api/wishlists/:id/share - Get share link for a wishlist
  app.fastify.get(
    '/api/wishlists/:id/share',
    {
      schema: {
        description: 'Get share link for a wishlist',
        tags: ['wishlists'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              shareUrl: { type: 'string' },
              shareToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;

      app.logger.info({ wishlistId: id, userId }, 'Generating share link');

      // Verify ownership
      const wishlist = await app.db.query.wishlists.findFirst({
        where: eq(schema.wishlists.id, id),
      });

      if (!wishlist || wishlist.userId !== userId) {
        app.logger.warn({ wishlistId: id, userId }, 'Wishlist not found');
        return reply.status(404).send({ error: 'Wishlist not found' });
      }

      // Generate or use existing share token
      let shareToken = wishlist.shareToken;
      if (!shareToken) {
        shareToken = Math.random().toString(36).substring(2, 22);
        await app.db
          .update(schema.wishlists)
          .set({ shareToken })
          .where(eq(schema.wishlists.id, id));
      }

      const shareUrl = `/api/wishlists/public/${shareToken}`;

      app.logger.info({ wishlistId: id, shareToken }, 'Share link generated');
      return {
        shareUrl,
        shareToken,
      };
    }
  );

  // GET /api/wishlists/public/:shareToken - Public read-only access to wishlist
  app.fastify.get(
    '/api/wishlists/public/:shareToken',
    {
      schema: {
        description: 'Get public wishlist by share token',
        tags: ['wishlists'],
        params: {
          type: 'object',
          properties: {
            shareToken: { type: 'string' },
          },
          required: ['shareToken'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    imageUrl: { type: 'string' },
                    currentPrice: { type: 'string' },
                    currency: { type: 'string' },
                    sourceUrl: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { shareToken: string };
      }>,
      reply: FastifyReply
    ) => {
      const { shareToken } = request.params;

      app.logger.info({ shareToken }, 'Fetching public wishlist');

      const wishlist = await app.db.query.wishlists.findFirst({
        where: eq(schema.wishlists.shareToken, shareToken),
        with: {
          items: {
            columns: {
              id: true,
              name: true,
              imageUrl: true,
              currentPrice: true,
              currency: true,
              sourceUrl: true,
            },
          },
        },
      });

      if (!wishlist) {
        app.logger.warn({ shareToken }, 'Public wishlist not found');
        return reply.status(404).send({ error: 'Wishlist not found' });
      }

      app.logger.info(
        { wishlistId: wishlist.id, itemCount: wishlist.items.length },
        'Public wishlist fetched'
      );
      return {
        id: wishlist.id,
        name: wishlist.name,
        items: wishlist.items,
      };
    }
  );
}
