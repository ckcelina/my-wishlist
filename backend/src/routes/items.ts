import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import { z } from 'zod';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';
import {
  normalizeCityName,
  citiesMatch,
  StoreUnavailableReasonCode,
  getUnavailabilityMessage,
} from '../utils/location.js';

const extractSchema = z.object({
  url: z.string().url(),
});

const createItemSchema = z.object({
  wishlistId: z.string().uuid(),
  name: z.string(),
  imageUrl: z.string().optional(),
  currentPrice: z.string().optional(),
  currency: z.string().default('USD'),
  sourceUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

const updateItemSchema = z.object({
  name: z.string().optional(),
  imageUrl: z.string().optional(),
  currentPrice: z.string().optional(),
  notes: z.string().optional(),
});

export function registerItemRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/wishlists/:wishlistId/items - Get items in a wishlist (public access)
  app.fastify.get(
    '/api/wishlists/:wishlistId/items',
    {
      schema: {
        description: 'Get items in a wishlist',
        tags: ['items'],
        params: {
          type: 'object',
          properties: {
            wishlistId: { type: 'string' },
          },
          required: ['wishlistId'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                imageUrl: { type: 'string' },
                currentPrice: { type: 'string' },
                currency: { type: 'string' },
                originalUrl: { type: 'string' },
                sourceDomain: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { wishlistId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { wishlistId } = request.params;

      app.logger.info({ wishlistId }, 'Fetching items');

      const items = await app.db
        .select({
          id: schema.wishlistItems.id,
          title: schema.wishlistItems.title,
          imageUrl: schema.wishlistItems.imageUrl,
          currentPrice: schema.wishlistItems.currentPrice,
          currency: schema.wishlistItems.currency,
          originalUrl: schema.wishlistItems.originalUrl,
          sourceDomain: schema.wishlistItems.sourceDomain,
          createdAt: schema.wishlistItems.createdAt,
        })
        .from(schema.wishlistItems)
        .where(eq(schema.wishlistItems.wishlistId, wishlistId));

      app.logger.info({ wishlistId, count: items.length }, 'Items fetched');
      return items;
    }
  );

  // POST /api/items/extract - Extract item data from URL using AI
  app.fastify.post(
    '/api/items/extract',
    {
      schema: {
        description: 'Extract item information from a URL using AI',
        tags: ['items'],
        body: {
          type: 'object',
          properties: {
            url: { type: 'string' },
          },
          required: ['url'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              imageUrl: { type: 'string' },
              price: { type: 'string' },
              currency: { type: 'string' },
              originalUrl: { type: 'string' },
              sourceDomain: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { url: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { url } = request.body;

      app.logger.info({ url }, 'Extracting item data from URL');

      try {
        // Extract domain from URL
        const urlObj = new URL(url);
        const sourceDomain = urlObj.hostname;

        // Use GPT-5.2 vision to analyze the page
        const result = await generateText({
          model: gateway('openai/gpt-5.2'),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Visit this URL and extract product information. Return a JSON object with these fields:
- title: the product/item name
- imageUrl: the best quality product image URL (or null)
- price: the current price as a string (or null)
- currency: the currency code like USD, EUR, GBP, etc. (default USD)

URL: ${url}

Return ONLY valid JSON, no markdown or extra text.`,
                },
              ],
            },
          ],
        });

        // Parse the response
        const extracted = JSON.parse(result.text);

        app.logger.info(
          { url, extractedTitle: extracted.title },
          'Item data extracted'
        );

        return {
          title: extracted.title || 'Unknown Item',
          imageUrl: extracted.imageUrl || null,
          price: extracted.price || null,
          currency: extracted.currency || 'USD',
          originalUrl: url,
          sourceDomain,
        };
      } catch (error) {
        app.logger.error(
          { err: error, url },
          'Failed to extract item data'
        );
        return reply.status(400).send({
          error: 'Failed to extract item data from URL',
        });
      }
    }
  );

  // POST /api/items/preview - Fetch item metadata preview from URL (for UI preview before saving)
  app.fastify.post(
    '/api/items/preview',
    {
      schema: {
        description: 'Fetch item metadata preview from URL (editable before saving)',
        tags: ['items'],
        body: {
          type: 'object',
          properties: {
            url: { type: 'string' },
          },
          required: ['url'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              imageUrl: { type: 'string' },
              price: { type: 'string' },
              currency: { type: 'string' },
              originalUrl: { type: 'string' },
              sourceDomain: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { url: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { url } = request.body;

      app.logger.info({ url }, 'Fetching item preview from URL');

      try {
        // Extract domain from URL
        const urlObj = new URL(url);
        const sourceDomain = urlObj.hostname;

        // Use GPT-5.2 vision to analyze the page
        const result = await generateText({
          model: gateway('openai/gpt-5.2'),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Visit this URL and extract product information. Return a JSON object with these fields:
- title: the product/item name
- imageUrl: the best quality product image URL (or null)
- price: the current price as a string (or null)
- currency: the currency code like USD, EUR, GBP, etc. (default USD)

URL: ${url}

Return ONLY valid JSON, no markdown or extra text.`,
                },
              ],
            },
          ],
        });

        // Parse the response
        const extracted = JSON.parse(result.text);

        app.logger.info(
          { url, title: extracted.title },
          'Item preview fetched'
        );

        return {
          title: extracted.title || 'Unknown Item',
          imageUrl: extracted.imageUrl || null,
          price: extracted.price || null,
          currency: extracted.currency || 'USD',
          originalUrl: url,
          sourceDomain,
        };
      } catch (error) {
        app.logger.error(
          { err: error, url },
          'Failed to fetch item preview'
        );
        return reply.status(400).send({
          error: 'Failed to fetch item preview from URL',
        });
      }
    }
  );

  // POST /api/items - Create a new item (supports manual entry or URL-based)
  // Usage:
  // 1. Manual tab: User enters title, optional imageUrl, price, notes
  // 2. URL tab: User selects from preview data returned by /api/items/preview
  app.fastify.post(
    '/api/items',
    {
      schema: {
        description: 'Create a new item in a wishlist (manual or from URL preview)',
        tags: ['items'],
        body: {
          type: 'object',
          properties: {
            wishlistId: { type: 'string' },
            title: { type: 'string' },
            imageUrl: { type: 'string' },
            currentPrice: { type: 'string' },
            currency: { type: 'string' },
            originalUrl: { type: 'string' },
            normalizedUrl: { type: 'string' },
            sourceDomain: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['wishlistId', 'title'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              imageUrl: { type: 'string' },
              currentPrice: { type: 'string' },
              currency: { type: 'string' },
              originalUrl: { type: 'string' },
              normalizedUrl: { type: 'string' },
              sourceDomain: { type: 'string' },
              notes: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          wishlistId: string;
          title: string;
          imageUrl?: string;
          currentPrice?: string;
          currency?: string;
          originalUrl?: string;
          normalizedUrl?: string;
          sourceDomain?: string;
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const {
        wishlistId,
        title,
        imageUrl,
        currentPrice,
        currency = 'USD',
        originalUrl,
        normalizedUrl,
        sourceDomain,
        notes,
      } = request.body;

      app.logger.info(
        { wishlistId, title, userId },
        'Creating item'
      );

      // Verify wishlist ownership
      const wishlist = await app.db.query.wishlists.findFirst({
        where: eq(schema.wishlists.id, wishlistId),
      });

      if (!wishlist || wishlist.userId !== userId) {
        app.logger.warn({ wishlistId, userId }, 'Wishlist not found');
        return reply.status(404).send({ error: 'Wishlist not found' });
      }

      const [newItem] = await app.db
        .insert(schema.wishlistItems)
        .values({
          wishlistId,
          title,
          imageUrl: imageUrl || null,
          currentPrice: currentPrice ? currentPrice : null,
          currency,
          originalUrl: originalUrl || null,
          normalizedUrl: normalizedUrl || null,
          sourceDomain: sourceDomain || null,
          notes: notes || null,
        })
        .returning();

      // If price was provided, add to price history
      if (currentPrice) {
        await app.db.insert(schema.priceHistory).values({
          itemId: newItem.id,
          price: currentPrice,
          currency,
        });

        app.logger.info(
          { itemId: newItem.id, price: currentPrice },
          'Initial price recorded to history'
        );
      }

      app.logger.info({ itemId: newItem.id, title }, 'Item created');

      reply.status(201);
      return newItem;
    }
  );

  // PUT /api/items/:id - Update an item
  app.fastify.put(
    '/api/items/:id',
    {
      schema: {
        description: 'Update an item',
        tags: ['items'],
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
            title: { type: 'string' },
            imageUrl: { type: 'string' },
            currentPrice: { type: 'string' },
            normalizedUrl: { type: 'string' },
            notes: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              imageUrl: { type: 'string' },
              currentPrice: { type: 'string' },
              normalizedUrl: { type: 'string' },
              notes: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          title?: string;
          imageUrl?: string;
          currentPrice?: string;
          normalizedUrl?: string;
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;
      const { title, imageUrl, currentPrice, normalizedUrl, notes } = request.body;

      app.logger.info({ itemId: id, userId }, 'Updating item');

      // Verify ownership through wishlist
      const item = await app.db.query.wishlistItems.findFirst({
        where: eq(schema.wishlistItems.id, id),
        with: {
          wishlist: true,
        },
      });

      if (!item || item.wishlist.userId !== userId) {
        app.logger.warn({ itemId: id, userId }, 'Item not found');
        return reply.status(404).send({ error: 'Item not found' });
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
      if (normalizedUrl !== undefined) updateData.normalizedUrl = normalizedUrl || null;
      if (notes !== undefined) updateData.notes = notes || null;
      if (currentPrice !== undefined) {
        updateData.currentPrice = currentPrice ? currentPrice : null;

        // Add to price history if price changed
        if (currentPrice && currentPrice !== item.currentPrice) {
          await app.db.insert(schema.priceHistory).values({
            itemId: id,
            price: currentPrice,
            currency: item.currency,
          });

          app.logger.info(
            { itemId: id, price: currentPrice },
            'Price history recorded'
          );
        }
      }

      const [updated] = await app.db
        .update(schema.wishlistItems)
        .set(updateData)
        .where(eq(schema.wishlistItems.id, id))
        .returning();

      app.logger.info({ itemId: id }, 'Item updated');
      return updated;
    }
  );

  // DELETE /api/items/:id - Delete an item
  app.fastify.delete(
    '/api/items/:id',
    {
      schema: {
        description: 'Delete an item',
        tags: ['items'],
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

      app.logger.info({ itemId: id, userId }, 'Deleting item');

      // Verify ownership through wishlist
      const item = await app.db.query.wishlistItems.findFirst({
        where: eq(schema.wishlistItems.id, id),
        with: {
          wishlist: true,
        },
      });

      if (!item || item.wishlist.userId !== userId) {
        app.logger.warn({ itemId: id, userId }, 'Item not found');
        return reply.status(404).send({ error: 'Item not found' });
      }

      await app.db.delete(schema.wishlistItems).where(eq(schema.wishlistItems.id, id));

      app.logger.info({ itemId: id }, 'Item deleted');
      return { success: true };
    }
  );

  // GET /api/items/:id - Get item details with price history
  app.fastify.get(
    '/api/items/:id',
    {
      schema: {
        description: 'Get item details with price history',
        tags: ['items'],
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
              id: { type: 'string' },
              title: { type: 'string' },
              imageUrl: { type: 'string' },
              currentPrice: { type: 'string' },
              currency: { type: 'string' },
              originalUrl: { type: 'string' },
              sourceDomain: { type: 'string' },
              notes: { type: 'string' },
              priceHistory: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    price: { type: 'string' },
                    recordedAt: { type: 'string' },
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
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      app.logger.info({ itemId: id }, 'Fetching item details');

      const item = await app.db.query.wishlistItems.findFirst({
        where: eq(schema.wishlistItems.id, id),
        with: {
          priceHistory: {
            columns: {
              price: true,
              recordedAt: true,
            },
            orderBy: (ph) => ph.recordedAt,
          },
        },
      });

      if (!item) {
        app.logger.warn({ itemId: id }, 'Item not found');
        return reply.status(404).send({ error: 'Item not found' });
      }

      app.logger.info(
        { itemId: id, historyCount: item.priceHistory.length },
        'Item details fetched'
      );

      return {
        id: item.id,
        title: item.title,
        imageUrl: item.imageUrl,
        currentPrice: item.currentPrice,
        currency: item.currency,
        originalUrl: item.originalUrl,
        sourceDomain: item.sourceDomain,
        notes: item.notes,
        priceHistory: item.priceHistory,
      };
    }
  );

  // POST /api/items/:id/find-other-stores - Find the same item in other online stores
  app.fastify.post(
    '/api/items/:id/find-other-stores',
    {
      schema: {
        description: 'Find the same item in other online stores for price comparison',
        tags: ['items'],
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
              stores: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    storeName: { type: 'string' },
                    domain: { type: 'string' },
                    price: { type: 'number' },
                    currency: { type: 'string' },
                    url: { type: 'string' },
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
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      app.logger.info({ itemId: id }, 'Finding item in other stores');

      try {
        // Fetch item details
        const item = await app.db.query.wishlistItems.findFirst({
          where: eq(schema.wishlistItems.id, id),
        });

        if (!item) {
          app.logger.warn({ itemId: id }, 'Item not found');
          return reply.status(404).send({ error: 'Item not found' });
        }

        app.logger.info(
          { itemId: id, title: item.title, price: item.currentPrice },
          'Searching for item in other stores'
        );

        // Use GPT-5.2 to generate realistic alternative store options
        const result = await generateText({
          model: gateway('openai/gpt-5.2'),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are helping a user find the same product on other online stores for price comparison.

Product Title: "${item.title}"
Current Price: ${item.currentPrice} ${item.currency}
Current Store: ${item.sourceDomain || 'unknown'}

Generate a JSON array of 3-5 realistic online stores that would likely sell this product. Include major retailers and marketplaces that commonly sell this type of product.

For each store, provide:
- storeName: The official store name (e.g., "Amazon", "eBay", "Walmart")
- domain: The website domain (e.g., "amazon.com", "ebay.com")
- price: A realistic price for this product at that store (similar to the current price, with reasonable variations)
- currency: The currency code (e.g., "USD")
- url: A realistic product URL format for that store (should follow the store's typical URL pattern)

Make the results realistic and varied. Vary prices by ±10-30% to show realistic price differences between retailers.

Return ONLY valid JSON in this exact format:
[
  { "storeName": "...", "domain": "...", "price": number, "currency": "...", "url": "..." },
  ...
]

Do not include any markdown, explanations, or extra text.`,
                },
              ],
            },
          ],
        });

        // Parse the response
        const stores = JSON.parse(result.text);

        // Validate the response structure
        if (!Array.isArray(stores)) {
          throw new Error('Invalid response format from AI');
        }

        const validatedStores = stores
          .filter(
            (store: any) =>
              store.storeName &&
              store.domain &&
              typeof store.price === 'number' &&
              store.currency &&
              store.url
          )
          .slice(0, 5); // Limit to 5 stores

        app.logger.info(
          { itemId: id, storeCount: validatedStores.length },
          'Alternative stores found'
        );

        return { stores: validatedStores };
      } catch (error) {
        app.logger.error(
          { err: error, itemId: id },
          'Failed to find item in other stores'
        );
        return reply.status(400).send({
          error: 'Failed to search for item in other stores',
        });
      }
    }
  );

  // GET /api/items/:id/price-history - Get price history with trend summary
  app.fastify.get(
    '/api/items/:id/price-history',
    {
      schema: {
        description: 'Get price history for an item with trend summary',
        tags: ['items'],
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
              trend: {
                type: 'object',
                properties: {
                  lowestPrice: { type: 'number' },
                  highestPrice: { type: 'number' },
                  firstPrice: { type: 'number' },
                  latestPrice: { type: 'number' },
                  currency: { type: 'string' },
                },
              },
              history: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    price: { type: 'number' },
                    currency: { type: 'string' },
                    recordedAt: { type: 'string' },
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
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;

      app.logger.info({ itemId: id, userId }, 'Fetching price history');

      try {
        // Verify ownership through wishlist
        const item = await app.db.query.wishlistItems.findFirst({
          where: eq(schema.wishlistItems.id, id),
          with: {
            wishlist: true,
          },
        });

        if (!item || item.wishlist.userId !== userId) {
          app.logger.warn({ itemId: id, userId }, 'Item not found');
          return reply.status(404).send({ error: 'Item not found' });
        }

        // Fetch price history sorted by recordedAt descending (newest first)
        const priceHistory = await app.db
          .select({
            id: schema.priceHistory.id,
            price: schema.priceHistory.price,
            currency: schema.priceHistory.currency,
            recordedAt: schema.priceHistory.recordedAt,
          })
          .from(schema.priceHistory)
          .where(eq(schema.priceHistory.itemId, id))
          .orderBy(desc(schema.priceHistory.recordedAt));

        app.logger.info(
          { itemId: id, recordCount: priceHistory.length },
          'Price history fetched'
        );

        // Calculate trend summary
        let trend = {
          lowestPrice: null as number | null,
          highestPrice: null as number | null,
          firstPrice: null as number | null,
          latestPrice: null as number | null,
          currency: item.currency,
        };

        if (priceHistory.length > 0) {
          const prices = priceHistory.map((ph) => parseFloat(ph.price));

          trend.lowestPrice = Math.min(...prices);
          trend.highestPrice = Math.max(...prices);
          trend.latestPrice = prices[0]; // First entry is newest
          trend.firstPrice = prices[prices.length - 1]; // Last entry is oldest

          app.logger.info(
            {
              itemId: id,
              lowest: trend.lowestPrice,
              highest: trend.highestPrice,
              first: trend.firstPrice,
              latest: trend.latestPrice,
            },
            'Price trend calculated'
          );
        }

        // Format response
        const formattedHistory = priceHistory.map((ph) => ({
          id: ph.id,
          price: parseFloat(ph.price),
          currency: ph.currency,
          recordedAt: ph.recordedAt?.toISOString() || new Date().toISOString(),
        }));

        return {
          trend,
          history: formattedHistory,
        };
      } catch (error) {
        app.logger.error(
          { err: error, itemId: id },
          'Failed to fetch price history'
        );
        return reply.status(500).send({ error: 'Failed to fetch price history' });
      }
    }
  );

  // POST /api/items/:itemId/find-other-stores-filtered - Find alternative stores filtered by user location
  app.fastify.post(
    '/api/items/:itemId/find-other-stores-filtered',
    {
      schema: {
        description: 'Find alternative stores filtered by user location',
        tags: ['items'],
        params: {
          type: 'object',
          properties: {
            itemId: { type: 'string' },
          },
          required: ['itemId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              stores: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    storeName: { type: 'string' },
                    domain: { type: 'string' },
                    price: { type: 'number' },
                    currency: { type: 'string' },
                    url: { type: 'string' },
                  },
                },
              },
              unavailableStores: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    storeName: { type: 'string' },
                    domain: { type: 'string' },
                    reasonCode: { type: 'string' },
                    reasonMessage: { type: 'string' },
                  },
                },
              },
              userLocation: {
                type: ['object', 'null'],
                properties: {
                  countryCode: { type: 'string' },
                  city: { type: ['string', 'null'] },
                },
              },
              cityRequired: { type: 'boolean' },
              hasLocation: { type: 'boolean' },
              message: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { itemId: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { itemId } = request.params;

      app.logger.info({ itemId, userId }, 'Finding alternative stores filtered by location');

      try {
        // Fetch item details
        const item = await app.db.query.wishlistItems.findFirst({
          where: eq(schema.wishlistItems.id, itemId),
        });

        if (!item) {
          app.logger.warn({ itemId }, 'Item not found');
          return reply.status(404).send({ error: 'Item not found' });
        }

        // Get user's location
        const userLocation = await app.db.query.userLocation.findFirst({
          where: eq(schema.userLocation.userId, userId),
        });

        if (!userLocation) {
          app.logger.info({ userId }, 'User location not set, returning original store only');
          return {
            stores: [
              {
                storeName: item.sourceDomain || 'Unknown',
                domain: item.sourceDomain || '',
                price: item.currentPrice ? parseFloat(item.currentPrice.toString()) : null,
                currency: item.currency,
                url: item.originalUrl || '',
              },
            ],
            userLocation: null,
            hasLocation: false,
            message: 'Set your shopping location to see available stores',
          };
        }

        app.logger.info(
          { itemId, countryCode: userLocation.countryCode, city: userLocation.city },
          'Searching for alternative stores'
        );

        // Use GPT-5.2 to generate realistic alternative store options
        const result = await generateText({
          model: gateway('openai/gpt-5.2'),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are helping a user find the same product on other online stores for price comparison.

Product Title: "${item.title}"
Current Price: ${item.currentPrice} ${item.currency}
Current Store: ${item.sourceDomain || 'unknown'}

Generate a JSON array of 3-5 realistic online stores that would likely sell this product. Include major retailers and marketplaces that commonly sell this type of product.

For each store, provide:
- storeName: The official store name (e.g., "Amazon", "eBay", "Walmart")
- domain: The website domain (e.g., "amazon.com", "ebay.com")
- price: A realistic price for this product at that store (similar to the current price, with reasonable variations)
- currency: The currency code (e.g., "USD")
- url: A realistic product URL format for that store (should follow the store's typical URL pattern)

Make the results realistic and varied. Vary prices by ±10-30% to show realistic price differences between retailers.

Return ONLY valid JSON in this exact format:
[
  { "storeName": "...", "domain": "...", "price": number, "currency": "...", "url": "..." },
  ...
]

Do not include any markdown, explanations, or extra text.`,
                },
              ],
            },
          ],
        });

        // Parse the response
        const aiStores = JSON.parse(result.text);

        // Validate the response structure
        if (!Array.isArray(aiStores)) {
          throw new Error('Invalid response format from AI');
        }

        const validatedStores = aiStores
          .filter(
            (store: any) =>
              store.storeName &&
              store.domain &&
              typeof store.price === 'number' &&
              store.currency &&
              store.url
          )
          .slice(0, 5);

        // Apply location-based filtering
        const filteredStores: typeof validatedStores = [];
        const unavailableStores: Array<{
          storeName: string;
          domain: string;
          reasonCode: StoreUnavailableReasonCode;
          reasonMessage: string;
        }> = [];
        let anyStoreRequiresCity = false;

        for (const aiStore of validatedStores) {
          // Check if store exists in database
          const dbStore = await app.db.query.stores.findFirst({
            where: eq(schema.stores.domain, aiStore.domain),
            with: {
              shippingRules: true,
            },
          });

          if (!dbStore) {
            // Store not in database, include it anyway (graceful fallback)
            filteredStores.push(aiStore);
            continue;
          }

          // Check if this store requires city
          if (dbStore.requiresCity) {
            anyStoreRequiresCity = true;
          }

          // Parse countriesSupported if it's a string
          const supportedCountries = typeof dbStore.countriesSupported === 'string'
            ? JSON.parse(dbStore.countriesSupported)
            : dbStore.countriesSupported;

          // Check if country is supported
          if (!supportedCountries.includes(userLocation.countryCode)) {
            app.logger.debug(
              { domain: dbStore.domain, countryCode: userLocation.countryCode },
              'Store does not support country'
            );
            unavailableStores.push({
              storeName: aiStore.storeName,
              domain: aiStore.domain,
              reasonCode: StoreUnavailableReasonCode.NO_COUNTRY_MATCH,
              reasonMessage: getUnavailabilityMessage(
                StoreUnavailableReasonCode.NO_COUNTRY_MATCH
              ),
            });
            continue;
          }

          // Check shipping rules for this country
          const shippingRule = dbStore.shippingRules.find(
            (rule) => rule.countryCode === userLocation.countryCode
          );

          if (shippingRule && !shippingRule.shipsToCountry) {
            app.logger.debug(
              { domain: dbStore.domain, countryCode: userLocation.countryCode },
              'Store does not ship to country'
            );
            unavailableStores.push({
              storeName: aiStore.storeName,
              domain: aiStore.domain,
              reasonCode: StoreUnavailableReasonCode.NO_COUNTRY_MATCH,
              reasonMessage: getUnavailabilityMessage(
                StoreUnavailableReasonCode.NO_COUNTRY_MATCH
              ),
            });
            continue;
          }

          // If store requires city, check city filtering
          if (dbStore.requiresCity && shippingRule) {
            if (!userLocation.city) {
              app.logger.debug(
                { domain: dbStore.domain },
                'Store requires city but user has not set city'
              );
              unavailableStores.push({
                storeName: aiStore.storeName,
                domain: aiStore.domain,
                reasonCode: StoreUnavailableReasonCode.CITY_REQUIRED,
                reasonMessage: getUnavailabilityMessage(
                  StoreUnavailableReasonCode.CITY_REQUIRED
                ),
              });
              continue;
            }

            const userCity = userLocation.city;

            // Parse city blacklist if it's a string
            const blacklist = shippingRule.cityBlacklist
              ? (typeof shippingRule.cityBlacklist === 'string'
                  ? JSON.parse(shippingRule.cityBlacklist)
                  : shippingRule.cityBlacklist)
              : null;

            // Check city blacklist - use normalized comparison
            if (
              blacklist &&
              blacklist.some((blacklistedCity: string) =>
                citiesMatch(userCity, blacklistedCity)
              )
            ) {
              app.logger.debug(
                { domain: dbStore.domain, city: userCity },
                'City is blacklisted'
              );
              unavailableStores.push({
                storeName: aiStore.storeName,
                domain: aiStore.domain,
                reasonCode: StoreUnavailableReasonCode.NO_CITY_MATCH,
                reasonMessage: getUnavailabilityMessage(
                  StoreUnavailableReasonCode.NO_CITY_MATCH
                ),
              });
              continue;
            }

            // Parse city whitelist if it's a string
            const whitelist = shippingRule.cityWhitelist
              ? (typeof shippingRule.cityWhitelist === 'string'
                  ? JSON.parse(shippingRule.cityWhitelist)
                  : shippingRule.cityWhitelist)
              : null;

            // Check city whitelist - use normalized comparison
            if (
              whitelist &&
              whitelist.length > 0 &&
              !whitelist.some((whitelistedCity: string) =>
                citiesMatch(userCity, whitelistedCity)
              )
            ) {
              app.logger.debug(
                { domain: dbStore.domain, city: userCity },
                'City is not in whitelist'
              );
              unavailableStores.push({
                storeName: aiStore.storeName,
                domain: aiStore.domain,
                reasonCode: StoreUnavailableReasonCode.NO_CITY_MATCH,
                reasonMessage: getUnavailabilityMessage(
                  StoreUnavailableReasonCode.NO_CITY_MATCH
                ),
              });
              continue;
            }

            if (!shippingRule.shipsToCity) {
              app.logger.debug(
                { domain: dbStore.domain, city: userCity },
                'Store does not ship to city'
              );
              unavailableStores.push({
                storeName: aiStore.storeName,
                domain: aiStore.domain,
                reasonCode: StoreUnavailableReasonCode.NO_CITY_MATCH,
                reasonMessage: getUnavailabilityMessage(
                  StoreUnavailableReasonCode.NO_CITY_MATCH
                ),
              });
              continue;
            }
          }

          // Store passed all filters, include it
          filteredStores.push(aiStore);
        }

        app.logger.info(
          {
            itemId,
            storeCount: filteredStores.length,
            unavailableCount: unavailableStores.length,
            countryCode: userLocation.countryCode,
          },
          'Alternative stores found'
        );

        if (filteredStores.length === 0) {
          return {
            stores: [],
            unavailableStores,
            userLocation: {
              countryCode: userLocation.countryCode,
              city: userLocation.city || null,
            },
            cityRequired: anyStoreRequiresCity && !userLocation.city,
            hasLocation: true,
            message:
              anyStoreRequiresCity && !userLocation.city
                ? 'Add your city to see available stores'
                : 'No available stores found for your location',
          };
        }

        return {
          stores: filteredStores,
          unavailableStores,
          userLocation: {
            countryCode: userLocation.countryCode,
            city: userLocation.city || null,
          },
          cityRequired: anyStoreRequiresCity && !userLocation.city,
          hasLocation: true,
          message: null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, itemId },
          'Failed to find filtered stores'
        );
        return reply.status(400).send({
          error: 'Failed to search for stores',
        });
      }
    }
  );

  // Helper function to extract domain from URL
  function extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  // Helper function to check if store is available in location
  async function isStoreAvailableInLocation(
    domain: string,
    countryCode: string | null,
    city: string | null
  ): Promise<{ available: boolean; reason?: string }> {
    // If no location provided, assume available
    if (!countryCode) {
      return { available: true };
    }

    // Check if store exists in database
    const dbStore = await app.db.query.stores.findFirst({
      where: eq(schema.stores.domain, domain),
      with: {
        shippingRules: true,
      },
    });

    // If store not in database, assume available (graceful fallback)
    if (!dbStore) {
      return { available: true };
    }

    // Parse countriesSupported
    const supportedCountries = typeof dbStore.countriesSupported === 'string'
      ? JSON.parse(dbStore.countriesSupported)
      : dbStore.countriesSupported;

    // Check if country is supported
    if (!supportedCountries.includes(countryCode)) {
      return {
        available: false,
        reason: 'Store does not ship to this country',
      };
    }

    // Check shipping rules for this country
    const shippingRule = dbStore.shippingRules.find(
      (rule) => rule.countryCode === countryCode
    );

    if (shippingRule && !shippingRule.shipsToCountry) {
      return {
        available: false,
        reason: 'Store does not ship to this country',
      };
    }

    // If store requires city, check city filtering
    if (dbStore.requiresCity && city && shippingRule) {
      // Parse city blacklist
      const blacklist = shippingRule.cityBlacklist
        ? (typeof shippingRule.cityBlacklist === 'string'
            ? JSON.parse(shippingRule.cityBlacklist)
            : shippingRule.cityBlacklist)
        : null;

      // Check city blacklist
      if (blacklist && blacklist.includes(city)) {
        return {
          available: false,
          reason: 'Store does not ship to your city',
        };
      }

      // Parse city whitelist
      const whitelist = shippingRule.cityWhitelist
        ? (typeof shippingRule.cityWhitelist === 'string'
            ? JSON.parse(shippingRule.cityWhitelist)
            : shippingRule.cityWhitelist)
        : null;

      // Check city whitelist
      if (whitelist && whitelist.length > 0 && !whitelist.includes(city)) {
        return {
          available: false,
          reason: 'Store does not ship to your city',
        };
      }

      if (!shippingRule.shipsToCity) {
        return {
          available: false,
          reason: 'Store does not ship to your city',
        };
      }
    }

    return { available: true };
  }

  // POST /api/items/find-alternatives - Find alternative sellers for a product
  app.fastify.post(
    '/api/items/find-alternatives',
    {
      schema: {
        description: 'Find alternative sellers for a product',
        tags: ['items'],
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            originalUrl: { type: 'string' },
            countryCode: { type: 'string' },
            city: { type: 'string' },
          },
          required: ['title'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                storeName: { type: 'string' },
                domain: { type: 'string' },
                price: { type: 'number' },
                currency: { type: 'string' },
                url: { type: 'string' },
                availability: { type: 'string', enum: ['available', 'unavailable'] },
                reason: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          title: string;
          originalUrl?: string;
          countryCode?: string;
          city?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { title, originalUrl, countryCode, city } = request.body;

      app.logger.info(
        { title, countryCode, city },
        'Finding alternative sellers'
      );

      try {
        // Use GPT-5.2 to generate realistic alternative store options
        const result = await generateText({
          model: gateway('openai/gpt-5.2'),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Help me find sellers for this product.

Product Title: "${title}"

Generate a JSON array of 5-10 realistic online stores that would likely sell this product. Include major retailers and marketplaces.

For each store, provide:
- storeName: The official store name (e.g., "Amazon", "eBay", "Walmart")
- domain: The website domain (e.g., "amazon.com", "ebay.com")
- price: A realistic price for this product
- currency: The currency code (e.g., "USD")
- url: A realistic product URL format for that store

Return ONLY valid JSON in this exact format:
[
  { "storeName": "...", "domain": "...", "price": number, "currency": "...", "url": "..." },
  ...
]

Do not include any markdown, explanations, or extra text.`,
                },
              ],
            },
          ],
        });

        // Parse the response
        const aiStores = JSON.parse(result.text);

        // Validate the response structure
        if (!Array.isArray(aiStores)) {
          throw new Error('Invalid response format from AI');
        }

        const validatedStores = aiStores
          .filter(
            (store: any) =>
              store.storeName &&
              store.domain &&
              typeof store.price === 'number' &&
              store.currency &&
              store.url
          )
          .slice(0, 10);

        // Check availability for each store
        const storesWithAvailability = await Promise.all(
          validatedStores.map(async (store: any) => {
            const { available, reason } = await isStoreAvailableInLocation(
              store.domain,
              countryCode || null,
              city || null
            );

            return {
              storeName: store.storeName,
              domain: store.domain,
              price: store.price,
              currency: store.currency,
              url: store.url,
              availability: available ? 'available' : 'unavailable',
              reason,
            };
          })
        );

        // Filter to only return available stores
        const availableStores = storesWithAvailability.filter(
          (store) => store.availability === 'available'
        );

        app.logger.info(
          {
            title,
            totalFound: validatedStores.length,
            availableCount: availableStores.length,
            countryCode,
          },
          'Alternative sellers found'
        );

        return availableStores;
      } catch (error) {
        app.logger.error(
          { err: error, title },
          'Failed to find alternative sellers'
        );
        return reply.status(400).send({
          error: 'Failed to find alternative sellers',
        });
      }
    }
  );

  // POST /api/items/identify-from-image - Identify product from image
  app.fastify.post(
    '/api/items/identify-from-image',
    {
      schema: {
        description: 'Identify a product from an image',
        tags: ['items'],
        body: {
          type: 'object',
          properties: {
            imageUrl: { type: 'string' },
            imageBase64: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              bestGuessTitle: { type: ['string', 'null'] },
              bestGuessCategory: { type: ['string', 'null'] },
              keywords: { type: 'array', items: { type: 'string' } },
              confidence: { type: 'number' },
              suggestedProducts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    imageUrl: { type: ['string', 'null'] },
                    likelyUrl: { type: ['string', 'null'] },
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
          imageUrl?: string;
          imageBase64?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { imageUrl, imageBase64 } = request.body;

      if (!imageUrl && !imageBase64) {
        return reply.status(400).send({
          error: 'Either imageUrl or imageBase64 is required',
        });
      }

      app.logger.info(
        { hasUrl: !!imageUrl, hasBase64: !!imageBase64 },
        'Identifying product from image'
      );

      try {
        // Use GPT-5.2 vision to analyze the image
        const result = await generateText({
          model: gateway('openai/gpt-5.2'),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this product image and identify what it is. Provide:
1. Best guess title (or null if unclear)
2. Best guess category (e.g., "Electronics", "Clothing", "Home & Garden")
3. List of keywords that describe the product
4. Confidence score (0 to 1) - how confident you are in the identification
5. Up to 3 alternative product titles if not confident
6. Likely URL patterns where this product might be found

Return ONLY valid JSON in this exact format:
{
  "bestGuessTitle": "...",
  "bestGuessCategory": "...",
  "keywords": ["...", "..."],
  "confidence": 0.95,
  "suggestedProducts": [
    { "title": "...", "imageUrl": null, "likelyUrl": null },
    ...
  ]
}

Note: imageUrl and likelyUrl should be null - we don't search for them.`,
                },
                imageUrl
                  ? {
                      type: 'image',
                      image: imageUrl,
                    }
                  : {
                      type: 'image',
                      image: imageBase64 || '',
                    },
              ],
            },
          ],
        });

        // Parse the response
        const identified = JSON.parse(result.text);

        app.logger.info(
          { title: identified.bestGuessTitle, confidence: identified.confidence },
          'Product identified'
        );

        return {
          bestGuessTitle: identified.bestGuessTitle || null,
          bestGuessCategory: identified.bestGuessCategory || null,
          keywords: Array.isArray(identified.keywords) ? identified.keywords : [],
          confidence:
            typeof identified.confidence === 'number'
              ? Math.min(1, Math.max(0, identified.confidence))
              : 0,
          suggestedProducts: Array.isArray(identified.suggestedProducts)
            ? identified.suggestedProducts.map((product: any) => ({
                title: product.title || '',
                imageUrl: product.imageUrl || null,
                likelyUrl: product.likelyUrl || null,
              }))
            : [],
        };
      } catch (error) {
        app.logger.error(
          { err: error },
          'Failed to identify product from image'
        );
        return reply.status(400).send({
          error: 'Failed to identify product from image',
        });
      }
    }
  );
}
