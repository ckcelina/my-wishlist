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
          createdAt: schema.wishlists.createdAt,
        })
        .from(schema.wishlists)
        .where(eq(schema.wishlists.userId, userId));

      // Add item count for each wishlist
      const wishlistsWithCounts = await Promise.all(
        userWishlists.map(async (wishlist) => {
          const [result] = await app.db
            .select({ count: count() })
            .from(schema.wishlistItems)
            .where(eq(schema.wishlistItems.wishlistId, wishlist.id));

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

  // Helper function to generate unique share slug
  async function generateUniqueShareSlug(): Promise<string> {
    let isUnique = false;
    let slug = '';

    while (!isUnique) {
      // Generate 8-10 character alphanumeric slug
      slug = Math.random().toString(36).substring(2, 10);

      // Check if slug already exists
      const existing = await app.db.query.sharedWishlists.findFirst({
        where: eq(schema.sharedWishlists.shareSlug, slug),
      });

      if (!existing) {
        isUnique = true;
      }
    }

    return slug;
  }

  // POST /api/wishlists/:id/share - Create or update share for a wishlist
  app.fastify.post(
    '/api/wishlists/:id/share',
    {
      schema: {
        description: 'Create or update share link for a wishlist',
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
            visibility: { type: 'string', enum: ['public', 'unlisted'] },
          },
          required: ['visibility'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              shareSlug: { type: 'string' },
              visibility: { type: 'string' },
              shareUrl: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { visibility: 'public' | 'unlisted' };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;
      const { visibility } = request.body;

      app.logger.info(
        { wishlistId: id, userId, visibility },
        'Creating or updating share'
      );

      // Verify ownership
      const wishlist = await app.db.query.wishlists.findFirst({
        where: eq(schema.wishlists.id, id),
      });

      if (!wishlist || wishlist.userId !== userId) {
        app.logger.warn({ wishlistId: id, userId }, 'Wishlist not found');
        return reply.status(404).send({ error: 'Wishlist not found' });
      }

      // Check if share record already exists
      let sharedWishlist = await app.db.query.sharedWishlists.findFirst({
        where: eq(schema.sharedWishlists.wishlistId, id),
      });

      if (sharedWishlist) {
        // Update visibility if share already exists
        const [updated] = await app.db
          .update(schema.sharedWishlists)
          .set({ visibility })
          .where(eq(schema.sharedWishlists.wishlistId, id))
          .returning();

        sharedWishlist = updated;

        app.logger.info(
          {
            wishlistId: id,
            shareSlug: sharedWishlist.shareSlug,
            visibility,
          },
          'Share visibility updated'
        );
      } else {
        // Generate unique share slug and create new share
        const shareSlug = await generateUniqueShareSlug();
        const [created] = await app.db
          .insert(schema.sharedWishlists)
          .values({
            wishlistId: id,
            shareSlug,
            visibility,
          })
          .returning();

        sharedWishlist = created;

        app.logger.info(
          {
            wishlistId: id,
            shareSlug: sharedWishlist.shareSlug,
            visibility,
          },
          'Share created'
        );
      }

      const shareUrl = `/api/wishlists/shared/${sharedWishlist.shareSlug}`;

      return {
        shareSlug: sharedWishlist.shareSlug,
        visibility: sharedWishlist.visibility,
        shareUrl,
      };
    }
  );

  // DELETE /api/wishlists/:id/share - Delete share for a wishlist
  app.fastify.delete(
    '/api/wishlists/:id/share',
    {
      schema: {
        description: 'Delete share link for a wishlist',
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

      app.logger.info({ wishlistId: id, userId }, 'Deleting share');

      // Verify ownership
      const wishlist = await app.db.query.wishlists.findFirst({
        where: eq(schema.wishlists.id, id),
      });

      if (!wishlist || wishlist.userId !== userId) {
        app.logger.warn({ wishlistId: id, userId }, 'Wishlist not found');
        return reply.status(404).send({ error: 'Wishlist not found' });
      }

      // Delete share record
      await app.db
        .delete(schema.sharedWishlists)
        .where(eq(schema.sharedWishlists.wishlistId, id));

      app.logger.info({ wishlistId: id }, 'Share deleted');

      return { success: true };
    }
  );

  // GET /api/wishlists/:id/share - Get current share settings for a wishlist
  app.fastify.get(
    '/api/wishlists/:id/share',
    {
      schema: {
        description: 'Get current share settings for a wishlist',
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
              shareSlug: { type: 'string' },
              visibility: { type: 'string' },
              shareUrl: { type: 'string' },
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

      app.logger.info({ wishlistId: id, userId }, 'Fetching share settings');

      // Verify ownership
      const wishlist = await app.db.query.wishlists.findFirst({
        where: eq(schema.wishlists.id, id),
      });

      if (!wishlist || wishlist.userId !== userId) {
        app.logger.warn({ wishlistId: id, userId }, 'Wishlist not found');
        return reply.status(404).send({ error: 'Wishlist not found' });
      }

      // Get share record
      const sharedWishlist = await app.db.query.sharedWishlists.findFirst({
        where: eq(schema.sharedWishlists.wishlistId, id),
      });

      if (!sharedWishlist) {
        app.logger.warn({ wishlistId: id }, 'Wishlist is not shared');
        return reply.status(404).send({ error: 'Wishlist is not shared' });
      }

      const shareUrl = `/api/wishlists/shared/${sharedWishlist.shareSlug}`;

      app.logger.info(
        {
          wishlistId: id,
          shareSlug: sharedWishlist.shareSlug,
          visibility: sharedWishlist.visibility,
        },
        'Share settings retrieved'
      );

      return {
        shareSlug: sharedWishlist.shareSlug,
        visibility: sharedWishlist.visibility,
        shareUrl,
      };
    }
  );

  // POST /api/wishlists/:id/regenerate-share - Regenerate share slug for a wishlist
  app.fastify.post(
    '/api/wishlists/:id/regenerate-share',
    {
      schema: {
        description: 'Regenerate share slug for a wishlist',
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
              shareSlug: { type: 'string' },
              visibility: { type: 'string' },
              shareUrl: { type: 'string' },
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

      app.logger.info({ wishlistId: id, userId }, 'Regenerating share slug');

      // Verify ownership
      const wishlist = await app.db.query.wishlists.findFirst({
        where: eq(schema.wishlists.id, id),
      });

      if (!wishlist || wishlist.userId !== userId) {
        app.logger.warn({ wishlistId: id, userId }, 'Wishlist not found');
        return reply.status(404).send({ error: 'Wishlist not found' });
      }

      // Get existing share record
      const sharedWishlist = await app.db.query.sharedWishlists.findFirst({
        where: eq(schema.sharedWishlists.wishlistId, id),
      });

      if (!sharedWishlist) {
        app.logger.warn({ wishlistId: id }, 'Wishlist is not shared');
        return reply.status(404).send({ error: 'Wishlist is not shared' });
      }

      // Generate new unique share slug
      const newShareSlug = await generateUniqueShareSlug();

      // Update share record with new slug
      const [updated] = await app.db
        .update(schema.sharedWishlists)
        .set({ shareSlug: newShareSlug })
        .where(eq(schema.sharedWishlists.wishlistId, id))
        .returning();

      const shareUrl = `/api/wishlists/shared/${updated.shareSlug}`;

      app.logger.info(
        {
          wishlistId: id,
          oldShareSlug: sharedWishlist.shareSlug,
          newShareSlug: updated.shareSlug,
        },
        'Share slug regenerated'
      );

      return {
        shareSlug: updated.shareSlug,
        visibility: updated.visibility,
        shareUrl,
      };
    }
  );

  // GET /api/wishlists/shared/:shareSlug - Public read-only access to wishlist
  app.fastify.get(
    '/api/wishlists/shared/:shareSlug',
    {
      schema: {
        description: 'Get public wishlist by share slug',
        tags: ['wishlists'],
        params: {
          type: 'object',
          properties: {
            shareSlug: { type: 'string' },
          },
          required: ['shareSlug'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              wishlist: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  visibility: { type: 'string' },
                },
              },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    imageUrl: { type: 'string' },
                    currentPrice: { type: 'string' },
                    currency: { type: 'string' },
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
        Params: { shareSlug: string };
      }>,
      reply: FastifyReply
    ) => {
      const { shareSlug } = request.params;

      app.logger.info({ shareSlug }, 'Fetching public wishlist');

      const sharedWishlist = await app.db.query.sharedWishlists.findFirst({
        where: eq(schema.sharedWishlists.shareSlug, shareSlug),
        with: {
          wishlist: {
            with: {
              items: {
                columns: {
                  id: true,
                  title: true,
                  imageUrl: true,
                  currentPrice: true,
                  currency: true,
                },
              },
            },
          },
        },
      });

      if (!sharedWishlist) {
        app.logger.warn({ shareSlug }, 'Public wishlist not found');
        return reply.status(404).send({ error: 'Wishlist not found' });
      }

      app.logger.info(
        {
          wishlistId: sharedWishlist.wishlist.id,
          itemCount: sharedWishlist.wishlist.items.length,
        },
        'Public wishlist fetched'
      );
      return {
        wishlist: {
          id: sharedWishlist.wishlist.id,
          name: sharedWishlist.wishlist.name,
          visibility: sharedWishlist.visibility,
        },
        items: sharedWishlist.wishlist.items,
      };
    }
  );
}
