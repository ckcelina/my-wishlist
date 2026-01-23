import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import { z } from 'zod';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

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
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;
      const { title, imageUrl, currentPrice, notes } = request.body;

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
}
