import type { FastifyRequest, FastifyReply } from 'fastify';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerStoresRoutes(app: App) {
  // POST /api/stores - Create a store (admin endpoint)
  app.fastify.post(
    '/api/stores',
    {
      schema: {
        description: 'Create a store',
        tags: ['stores'],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            domain: { type: 'string' },
            type: { type: 'string', enum: ['website', 'marketplace'] },
            countriesSupported: { type: 'array', items: { type: 'string' } },
            requiresCity: { type: 'boolean' },
            notes: { type: 'string' },
          },
          required: ['name', 'domain', 'type', 'countriesSupported'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              domain: { type: 'string' },
              type: { type: 'string' },
              countriesSupported: { type: 'array', items: { type: 'string' } },
              requiresCity: { type: 'boolean' },
              notes: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          domain: string;
          type: 'website' | 'marketplace';
          countriesSupported: string[];
          requiresCity?: boolean;
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { name, domain, type, countriesSupported, requiresCity, notes } =
        request.body;

      app.logger.info(
        { name, domain, type },
        'Creating store'
      );

      try {
        const storeValues: any = {
          name,
          domain,
          type,
          countriesSupported: JSON.stringify(countriesSupported) as any,
          requiresCity: requiresCity || false,
          notes: notes || null,
        };

        const [store] = await app.db
          .insert(schema.stores)
          .values(storeValues)
          .returning();

        app.logger.info({ storeId: store.id, name }, 'Store created');

        reply.status(201);
        return {
          id: store.id,
          name: store.name,
          domain: store.domain,
          type: store.type,
          countriesSupported: typeof store.countriesSupported === 'string' ? JSON.parse(store.countriesSupported) : store.countriesSupported,
          requiresCity: store.requiresCity,
          notes: store.notes || null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, domain },
          'Failed to create store'
        );
        return reply.status(400).send({
          error: 'Failed to create store',
        });
      }
    }
  );

  // POST /api/stores/:storeId/shipping-rules - Add shipping rule for a store
  app.fastify.post(
    '/api/stores/:storeId/shipping-rules',
    {
      schema: {
        description: 'Add shipping rule for a store',
        tags: ['stores'],
        params: {
          type: 'object',
          properties: {
            storeId: { type: 'string' },
          },
          required: ['storeId'],
        },
        body: {
          type: 'object',
          properties: {
            countryCode: { type: 'string' },
            cityWhitelist: { type: 'array', items: { type: 'string' } },
            cityBlacklist: { type: 'array', items: { type: 'string' } },
            shipsToCountry: { type: 'boolean' },
            shipsToCity: { type: 'boolean' },
            deliveryMethods: { type: 'array', items: { type: 'string' } },
          },
          required: ['countryCode'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              storeId: { type: 'string' },
              countryCode: { type: 'string' },
              cityWhitelist: { type: ['array', 'null'] },
              cityBlacklist: { type: ['array', 'null'] },
              shipsToCountry: { type: 'boolean' },
              shipsToCity: { type: 'boolean' },
              deliveryMethods: { type: ['array', 'null'] },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { storeId: string };
        Body: {
          countryCode: string;
          cityWhitelist?: string[];
          cityBlacklist?: string[];
          shipsToCountry?: boolean;
          shipsToCity?: boolean;
          deliveryMethods?: string[];
        };
      }>,
      reply: FastifyReply
    ) => {
      const { storeId } = request.params;
      const {
        countryCode,
        cityWhitelist,
        cityBlacklist,
        shipsToCountry,
        shipsToCity,
        deliveryMethods,
      } = request.body;

      app.logger.info(
        { storeId, countryCode },
        'Creating shipping rule'
      );

      try {
        const ruleValues: any = {
          storeId,
          countryCode,
          cityWhitelist: cityWhitelist ? (JSON.stringify(cityWhitelist) as any) : null,
          cityBlacklist: cityBlacklist ? (JSON.stringify(cityBlacklist) as any) : null,
          shipsToCountry: shipsToCountry !== undefined ? shipsToCountry : true,
          shipsToCity: shipsToCity !== undefined ? shipsToCity : true,
          deliveryMethods: deliveryMethods ? (JSON.stringify(deliveryMethods) as any) : null,
        };

        const [rule] = await app.db
          .insert(schema.storeShippingRules)
          .values(ruleValues)
          .returning();

        app.logger.info(
          { ruleId: rule.id, storeId, countryCode },
          'Shipping rule created'
        );

        reply.status(201);
        return {
          id: rule.id,
          storeId: rule.storeId,
          countryCode: rule.countryCode,
          cityWhitelist: rule.cityWhitelist ? (typeof rule.cityWhitelist === 'string' ? JSON.parse(rule.cityWhitelist) : rule.cityWhitelist) : null,
          cityBlacklist: rule.cityBlacklist ? (typeof rule.cityBlacklist === 'string' ? JSON.parse(rule.cityBlacklist) : rule.cityBlacklist) : null,
          shipsToCountry: rule.shipsToCountry,
          shipsToCity: rule.shipsToCity,
          deliveryMethods: rule.deliveryMethods ? (typeof rule.deliveryMethods === 'string' ? JSON.parse(rule.deliveryMethods) : rule.deliveryMethods) : null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, storeId, countryCode },
          'Failed to create shipping rule'
        );
        return reply.status(400).send({
          error: 'Failed to create shipping rule',
        });
      }
    }
  );
}
