import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerLocationRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/users/location - Get current user's location profile
  app.fastify.get(
    '/api/users/location',
    {
      schema: {
        description: 'Get current user location profile',
        tags: ['users', 'location'],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              countryCode: { type: 'string' },
              countryName: { type: 'string' },
              city: { type: ['string', 'null'] },
              region: { type: ['string', 'null'] },
              postalCode: { type: ['string', 'null'] },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, 'Fetching user location');

      try {
        const location = await app.db.query.userLocation.findFirst({
          where: eq(schema.userLocation.userId, userId),
        });

        if (!location) {
          app.logger.info({ userId }, 'User location not found');
          return reply.status(404).send({ error: 'Location not set' });
        }

        app.logger.info(
          { userId, countryCode: location.countryCode },
          'User location retrieved'
        );

        return {
          id: location.id,
          userId: location.userId,
          countryCode: location.countryCode,
          countryName: location.countryName,
          city: location.city || null,
          region: location.region || null,
          postalCode: location.postalCode || null,
          updatedAt: location.updatedAt.toISOString(),
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to fetch user location'
        );
        return reply.status(500).send({ error: 'Failed to fetch location' });
      }
    }
  );

  // POST /api/users/location - Create or update user location
  app.fastify.post(
    '/api/users/location',
    {
      schema: {
        description: 'Create or update user location profile',
        tags: ['users', 'location'],
        body: {
          type: 'object',
          properties: {
            countryCode: { type: 'string' },
            countryName: { type: 'string' },
            city: { type: 'string' },
            region: { type: 'string' },
            postalCode: { type: 'string' },
          },
          required: ['countryCode', 'countryName'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              countryCode: { type: 'string' },
              countryName: { type: 'string' },
              city: { type: ['string', 'null'] },
              region: { type: ['string', 'null'] },
              postalCode: { type: ['string', 'null'] },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          countryCode: string;
          countryName: string;
          city?: string;
          region?: string;
          postalCode?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { countryCode, countryName, city, region, postalCode } =
        request.body;

      app.logger.info(
        { userId, countryCode, city },
        'Creating or updating user location'
      );

      try {
        // Check if location already exists
        const existingLocation = await app.db.query.userLocation.findFirst({
          where: eq(schema.userLocation.userId, userId),
        });

        let location;

        if (existingLocation) {
          // Update existing location
          const [updated] = await app.db
            .update(schema.userLocation)
            .set({
              countryCode,
              countryName,
              city: city || null,
              region: region || null,
              postalCode: postalCode || null,
            })
            .where(eq(schema.userLocation.userId, userId))
            .returning();

          location = updated;

          app.logger.info(
            { userId, countryCode },
            'User location updated'
          );
        } else {
          // Create new location
          const [created] = await app.db
            .insert(schema.userLocation)
            .values({
              userId,
              countryCode,
              countryName,
              city: city || null,
              region: region || null,
              postalCode: postalCode || null,
            })
            .returning();

          location = created;

          app.logger.info(
            { userId, countryCode },
            'User location created'
          );
        }

        return {
          id: location.id,
          userId: location.userId,
          countryCode: location.countryCode,
          countryName: location.countryName,
          city: location.city || null,
          region: location.region || null,
          postalCode: location.postalCode || null,
          updatedAt: location.updatedAt.toISOString(),
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to update user location'
        );
        return reply.status(500).send({ error: 'Failed to update location' });
      }
    }
  );

  // DELETE /api/users/location - Delete user location
  app.fastify.delete(
    '/api/users/location',
    {
      schema: {
        description: 'Delete user location profile',
        tags: ['users', 'location'],
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

      app.logger.info({ userId }, 'Deleting user location');

      try {
        await app.db
          .delete(schema.userLocation)
          .where(eq(schema.userLocation.userId, userId));

        app.logger.info({ userId }, 'User location deleted');

        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to delete user location'
        );
        return reply.status(500).send({ error: 'Failed to delete location' });
      }
    }
  );
}
