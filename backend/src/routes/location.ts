import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';
import { convertCurrency } from '../utils/exchange-rates.js';

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
              area: { type: ['string', 'null'] },
              addressLine: { type: ['string', 'null'] },
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
          area: location.area || null,
          addressLine: location.addressLine || null,
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
            area: { type: 'string' },
            addressLine: { type: 'string' },
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
              area: { type: ['string', 'null'] },
              addressLine: { type: ['string', 'null'] },
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
          area?: string;
          addressLine?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { countryCode, countryName, city, region, postalCode, area, addressLine } =
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
              area: area || null,
              addressLine: addressLine || null,
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
              area: area || null,
              addressLine: addressLine || null,
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
          area: location.area || null,
          addressLine: location.addressLine || null,
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

  // POST /api/convert-currency - Convert amount between currencies
  app.fastify.post(
    '/api/convert-currency',
    {
      schema: {
        description: 'Convert amount from one currency to another',
        tags: ['utils', 'currency'],
        body: {
          type: 'object',
          properties: {
            fromCurrency: { type: 'string' },
            toCurrency: { type: 'string' },
            amount: { type: 'number' },
          },
          required: ['fromCurrency', 'toCurrency', 'amount'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              convertedAmount: { type: ['number', 'null'] },
              rate: { type: ['number', 'null'] },
              error: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          fromCurrency: string;
          toCurrency: string;
          amount: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { fromCurrency, toCurrency, amount } = request.body;

      app.logger.info(
        { fromCurrency, toCurrency, amount },
        'Converting currency'
      );

      try {
        const rate = await convertCurrency(fromCurrency, toCurrency, amount);

        if (!rate) {
          app.logger.warn(
            { fromCurrency, toCurrency },
            'Currency conversion not available'
          );
          return {
            convertedAmount: null,
            rate: null,
            error: 'Conversion not available for this currency pair',
          };
        }

        app.logger.info(
          { fromCurrency, toCurrency, amount, convertedAmount: rate.convertedAmount, rate: rate.rate },
          'Currency conversion successful'
        );

        return {
          convertedAmount: rate.convertedAmount,
          rate: rate.rate,
          error: null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, fromCurrency, toCurrency, amount },
          'Failed to convert currency'
        );
        return {
          convertedAmount: null,
          rate: null,
          error: 'Currency conversion failed',
        };
      }
    }
  );
}
