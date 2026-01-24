import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerReservationRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/shared/:shareSlug/reservations - Get reservations for shared wishlist
  app.fastify.get(
    '/api/shared/:shareSlug/reservations',
    {
      schema: {
        description: 'Get reservations for a shared wishlist',
        tags: ['reservations'],
        params: {
          type: 'object',
          properties: {
            shareSlug: { type: 'string' },
          },
          required: ['shareSlug'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                itemId: { type: 'string' },
                reservedByName: { type: 'string' },
                reservedAt: { type: 'string' },
                status: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          shareSlug: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { shareSlug } = request.params;

      app.logger.info({ shareSlug }, 'Fetching reservations');

      try {
        const sharedWishlist = await app.db.query.sharedWishlists.findFirst({
          where: eq(schema.sharedWishlists.shareSlug, shareSlug),
        });

        if (!sharedWishlist) {
          return reply.status(404).send({ error: 'Wishlist not found' });
        }

        const reservations = await app.db
          .select({
            id: schema.itemReservations.id,
            itemId: schema.itemReservations.itemId,
            reservedByName: schema.itemReservations.reservedByName,
            reservedAt: schema.itemReservations.reservedAt,
            status: schema.itemReservations.status,
          })
          .from(schema.itemReservations)
          .where(
            and(
              eq(schema.itemReservations.sharedWishlistId, sharedWishlist.id),
              eq(schema.itemReservations.status, 'reserved')
            )
          );

        app.logger.info(
          { shareSlug, count: reservations.length },
          'Reservations fetched'
        );

        return reservations.map((r) => ({
          ...r,
          reservedAt: r.reservedAt.toISOString(),
        }));
      } catch (error) {
        app.logger.error(
          { err: error, shareSlug },
          'Failed to fetch reservations'
        );
        return reply.status(500).send({ error: 'Failed to fetch reservations' });
      }
    }
  );

  // POST /api/shared/:shareSlug/reserve - Reserve an item
  app.fastify.post(
    '/api/shared/:shareSlug/reserve',
    {
      schema: {
        description: 'Reserve an item in a shared wishlist',
        tags: ['reservations'],
        params: {
          type: 'object',
          properties: {
            shareSlug: { type: 'string' },
          },
          required: ['shareSlug'],
        },
        body: {
          type: 'object',
          properties: {
            itemId: { type: 'string' },
            guestName: { type: 'string' },
          },
          required: ['itemId', 'guestName'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              itemId: { type: 'string' },
              reservedByName: { type: 'string' },
              reservedAt: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          shareSlug: string;
        };
        Body: {
          itemId: string;
          guestName: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { shareSlug } = request.params;
      const { itemId, guestName } = request.body;

      app.logger.info({ shareSlug, itemId, guestName }, 'Reserving item');

      try {
        const sharedWishlist = await app.db.query.sharedWishlists.findFirst({
          where: eq(schema.sharedWishlists.shareSlug, shareSlug),
        });

        if (!sharedWishlist) {
          return reply.status(404).send({ error: 'Wishlist not found' });
        }

        if (!sharedWishlist.allowReservations) {
          return reply
            .status(403)
            .send({ error: 'Reservations not allowed for this wishlist' });
        }

        // Check if item already has active reservation
        const existingReservation = await app.db.query.itemReservations.findFirst({
          where: and(
            eq(schema.itemReservations.itemId, itemId),
            eq(schema.itemReservations.status, 'reserved')
          ),
        });

        if (existingReservation) {
          return reply.status(409).send({ error: 'Item already reserved' });
        }

        const [reservation] = await app.db
          .insert(schema.itemReservations)
          .values({
            sharedWishlistId: sharedWishlist.id,
            itemId,
            reservedByName: guestName,
            status: 'reserved',
          })
          .returning();

        app.logger.info(
          { reservationId: reservation.id, itemId },
          'Item reserved'
        );

        reply.status(201);
        return {
          id: reservation.id,
          itemId: reservation.itemId,
          reservedByName: reservation.reservedByName,
          reservedAt: reservation.reservedAt.toISOString(),
          status: reservation.status,
        };
      } catch (error) {
        app.logger.error(
          { err: error, shareSlug, itemId },
          'Failed to reserve item'
        );
        return reply.status(500).send({ error: 'Failed to reserve item' });
      }
    }
  );

  // DELETE /api/shared/:shareSlug/reserve/:itemId - Release reservation
  app.fastify.delete(
    '/api/shared/:shareSlug/reserve/:itemId',
    {
      schema: {
        description: 'Release a reservation',
        tags: ['reservations'],
        params: {
          type: 'object',
          properties: {
            shareSlug: { type: 'string' },
            itemId: { type: 'string' },
          },
          required: ['shareSlug', 'itemId'],
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
        Params: {
          shareSlug: string;
          itemId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { shareSlug, itemId } = request.params;

      app.logger.info({ shareSlug, itemId }, 'Releasing reservation');

      try {
        const sharedWishlist = await app.db.query.sharedWishlists.findFirst({
          where: eq(schema.sharedWishlists.shareSlug, shareSlug),
        });

        if (!sharedWishlist) {
          return reply.status(404).send({ error: 'Wishlist not found' });
        }

        await app.db
          .update(schema.itemReservations)
          .set({ status: 'released' })
          .where(
            and(
              eq(schema.itemReservations.itemId, itemId),
              eq(schema.itemReservations.sharedWishlistId, sharedWishlist.id)
            )
          );

        app.logger.info({ shareSlug, itemId }, 'Reservation released');

        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, shareSlug, itemId },
          'Failed to release reservation'
        );
        return reply.status(500).send({ error: 'Failed to release reservation' });
      }
    }
  );

  // GET /api/wishlists/:id/reservations - Get reservations for owner
  app.fastify.get(
    '/api/wishlists/:id/reservations',
    {
      schema: {
        description: 'Get all reservations for a wishlist (owner only)',
        tags: ['reservations'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                itemId: { type: 'string' },
                itemTitle: { type: 'string' },
                reservedByName: { type: 'string' },
                reservedAt: { type: 'string' },
                status: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          id: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;

      app.logger.info({ wishlistId: id, userId }, 'Fetching wishlist reservations');

      try {
        // Verify ownership
        const wishlist = await app.db.query.wishlists.findFirst({
          where: eq(schema.wishlists.id, id),
        });

        if (!wishlist || wishlist.userId !== userId) {
          return reply.status(404).send({ error: 'Wishlist not found' });
        }

        const reservations = await app.db
          .select({
            id: schema.itemReservations.id,
            itemId: schema.itemReservations.itemId,
            itemTitle: schema.wishlistItems.title,
            reservedByName: schema.itemReservations.reservedByName,
            reservedAt: schema.itemReservations.reservedAt,
            status: schema.itemReservations.status,
          })
          .from(schema.itemReservations)
          .innerJoin(
            schema.wishlistItems,
            eq(schema.itemReservations.itemId, schema.wishlistItems.id)
          )
          .innerJoin(
            schema.sharedWishlists,
            eq(schema.itemReservations.sharedWishlistId, schema.sharedWishlists.id)
          )
          .where(eq(schema.sharedWishlists.wishlistId, id));

        app.logger.info(
          { wishlistId: id, count: reservations.length },
          'Reservations fetched'
        );

        return reservations.map((r) => ({
          ...r,
          reservedAt: r.reservedAt.toISOString(),
        }));
      } catch (error) {
        app.logger.error(
          { err: error, wishlistId: id, userId },
          'Failed to fetch reservations'
        );
        return reply.status(500).send({ error: 'Failed to fetch reservations' });
      }
    }
  );

  // PUT /api/wishlists/:id/reservation-settings - Update reservation settings
  app.fastify.put(
    '/api/wishlists/:id/reservation-settings',
    {
      schema: {
        description: 'Update reservation settings for a wishlist',
        tags: ['reservations'],
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
            allowReservations: { type: 'boolean' },
            hideReservedItems: { type: 'boolean' },
            showReserverNames: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              allowReservations: { type: 'boolean' },
              hideReservedItems: { type: 'boolean' },
              showReserverNames: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          id: string;
        };
        Body: {
          allowReservations?: boolean;
          hideReservedItems?: boolean;
          showReserverNames?: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;
      const { allowReservations, hideReservedItems, showReserverNames } =
        request.body;

      app.logger.info({ wishlistId: id, userId }, 'Updating reservation settings');

      try {
        // Verify ownership
        const wishlist = await app.db.query.wishlists.findFirst({
          where: eq(schema.wishlists.id, id),
        });

        if (!wishlist || wishlist.userId !== userId) {
          return reply.status(404).send({ error: 'Wishlist not found' });
        }

        // Get shared wishlist
        const sharedWishlist = await app.db.query.sharedWishlists.findFirst({
          where: eq(schema.sharedWishlists.wishlistId, id),
        });

        if (!sharedWishlist) {
          return reply
            .status(400)
            .send({ error: 'Wishlist is not shared yet' });
        }

        const updateData: any = {};
        if (allowReservations !== undefined)
          updateData.allowReservations = allowReservations;
        if (hideReservedItems !== undefined)
          updateData.hideReservedItems = hideReservedItems;
        if (showReserverNames !== undefined)
          updateData.showReserverNames = showReserverNames;

        const [updated] = await app.db
          .update(schema.sharedWishlists)
          .set(updateData)
          .where(eq(schema.sharedWishlists.id, sharedWishlist.id))
          .returning();

        app.logger.info({ wishlistId: id }, 'Reservation settings updated');

        return {
          allowReservations: updated.allowReservations,
          hideReservedItems: updated.hideReservedItems,
          showReserverNames: updated.showReserverNames,
        };
      } catch (error) {
        app.logger.error(
          { err: error, wishlistId: id, userId },
          'Failed to update reservation settings'
        );
        return reply
          .status(500)
          .send({ error: 'Failed to update reservation settings' });
      }
    }
  );
}
