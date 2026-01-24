import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, like } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';
import { getCountries } from '../utils/countries.js';
import { getCurrencies, getDefaultCurrencyForCountry, formatMoney } from '../utils/currencies.js';

const GEONAMES_API = 'http://api.geonames.org/searchJSON';
const GEONAMES_TIMEOUT_MS = 5000;

interface GeoNamesResult {
  geonameId: number;
  name: string;
  adminName1: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lng: number;
}

interface CitySearchResult {
  name: string;
  region: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lng: number;
  geonameId: string;
}

export function registerLocationDataRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/countries - List all countries
  app.fastify.get(
    '/api/countries',
    {
      schema: {
        description: 'Get list of all countries',
        tags: ['location'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                countryCode: { type: 'string' },
                countryName: { type: 'string' },
                flag: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      app.logger.info({}, 'Fetching countries list');

      try {
        const countries = getCountries();
        return countries;
      } catch (error) {
        app.logger.error(
          { err: error },
          'Failed to fetch countries'
        );
        return reply.status(500).send({ error: 'Failed to fetch countries' });
      }
    }
  );

  // GET /api/currencies - List/search currencies
  app.fastify.get(
    '/api/currencies',
    {
      schema: {
        description: 'Search currencies by code or name',
        tags: ['location'],
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                currencyCode: { type: 'string' },
                currencyName: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          q?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { q } = request.query;
      app.logger.info({ query: q }, 'Searching currencies');

      try {
        const currencies = getCurrencies(q);
        return currencies;
      } catch (error) {
        app.logger.error(
          { err: error, query: q },
          'Failed to search currencies'
        );
        return reply.status(500).send({ error: 'Failed to search currencies' });
      }
    }
  );

  // GET /api/default-currency/:countryCode - Get default currency for country
  app.fastify.get(
    '/api/default-currency/:countryCode',
    {
      schema: {
        description: 'Get default currency for a country',
        tags: ['location'],
        params: {
          type: 'object',
          properties: {
            countryCode: { type: 'string' },
          },
          required: ['countryCode'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              currencyCode: { type: 'string' },
              currencyName: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          countryCode: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { countryCode } = request.params;
      app.logger.info({ countryCode }, 'Fetching default currency');

      try {
        const currencyCode = getDefaultCurrencyForCountry(countryCode);
        if (!currencyCode) {
          return reply
            .status(404)
            .send({ error: 'No default currency found for country' });
        }

        return {
          currencyCode,
          currencyName: 'Currency',
        };
      } catch (error) {
        app.logger.error(
          { err: error, countryCode },
          'Failed to fetch default currency'
        );
        return reply
          .status(500)
          .send({ error: 'Failed to fetch default currency' });
      }
    }
  );

  // POST /api/location/search-cities - Search cities globally
  app.fastify.post(
    '/api/location/search-cities',
    {
      schema: {
        description: 'Search cities globally using GeoNames',
        tags: ['location'],
        body: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            countryCode: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['query'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    region: { type: 'string' },
                    countryCode: { type: 'string' },
                    countryName: { type: 'string' },
                    lat: { type: 'number' },
                    lng: { type: 'number' },
                    geonameId: { type: 'string' },
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
        Body: {
          query: string;
          countryCode?: string;
          limit?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { query, countryCode, limit = 10 } = request.body;

      app.logger.info(
        { query, countryCode, limit },
        'Searching cities'
      );

      try {
        // Check cache first
        const cacheKey = countryCode ? `${query}_${countryCode}` : query;
        const cached = await app.db.query.citySearchCache.findFirst({
          where: and(
            like(schema.citySearchCache.query, query),
            countryCode
              ? eq(schema.citySearchCache.countryCode, countryCode)
              : undefined
          ),
        });

        if (
          cached &&
          Date.now() - cached.cachedAt.getTime() < 24 * 60 * 60 * 1000
        ) {
          app.logger.info({ query }, 'Cache hit for city search');
          return {
            results: JSON.parse(cached.resultsJson) as CitySearchResult[],
          };
        }

        // Search GeoNames
        const geonamesUsername = process.env.GEONAMES_USERNAME;
        if (!geonamesUsername) {
          app.logger.warn({}, 'GeoNames API username not configured');
          return { results: [] };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GEONAMES_TIMEOUT_MS);

        try {
          const params = new URLSearchParams({
            q: query,
            username: geonamesUsername,
            maxRows: Math.min(limit, 50).toString(),
            featureClass: 'P', // Cities
          });

          if (countryCode) {
            params.append('countryBias', countryCode);
          }

          const response = await fetch(`${GEONAMES_API}?${params.toString()}`, {
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            app.logger.warn(
              { status: response.status },
              'GeoNames API error'
            );
            return { results: [] };
          }

          const data = (await response.json()) as {
            geonames?: GeoNamesResult[];
          };
          const results: CitySearchResult[] = (data.geonames || []).map((r) => ({
            name: r.name,
            region: r.adminName1,
            countryCode: r.countryCode,
            countryName: r.countryName,
            lat: r.lat,
            lng: r.lng,
            geonameId: r.geonameId.toString(),
          }));

          // Cache results
          await app.db
            .insert(schema.citySearchCache)
            .values({
              query,
              countryCode: countryCode || null,
              resultsJson: JSON.stringify(results),
              cachedAt: new Date(),
            })
            .catch(() => {
              // Silently fail caching
            });

          app.logger.info(
            { query, resultCount: results.length },
            'Cities found'
          );

          return { results };
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === 'AbortError') {
            app.logger.warn({ query }, 'City search timeout');
          } else {
            app.logger.error(
              { err: error, query },
              'Failed to search cities'
            );
          }
          return { results: [] };
        }
      } catch (error) {
        app.logger.error(
          { err: error, query },
          'Failed to search cities'
        );
        return reply.status(500).send({ error: 'Failed to search cities' });
      }
    }
  );

  // POST /api/utils/format-money - Format money for display
  app.fastify.post(
    '/api/utils/format-money',
    {
      schema: {
        description: 'Format money amount with currency',
        tags: ['utils'],
        body: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            currencyCode: { type: 'string' },
            locale: { type: 'string' },
          },
          required: ['amount', 'currencyCode'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              formatted: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          amount: number;
          currencyCode: string;
          locale?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { amount, currencyCode, locale } = request.body;

      try {
        const formatted = formatMoney(amount, currencyCode, locale);
        return { formatted };
      } catch (error) {
        app.logger.error(
          { err: error, currencyCode, amount },
          'Failed to format money'
        );
        return reply.status(400).send({ error: 'Failed to format money' });
      }
    }
  );
}
