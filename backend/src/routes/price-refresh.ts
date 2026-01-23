import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

interface ExtractedPrice {
  price: number | null;
  currency: string;
}

async function extractPriceFromUrl(url: string, logger: any): Promise<ExtractedPrice | null> {
  try {
    logger.info({ url }, 'Extracting price from URL for refresh');

    const result = await generateText({
      model: gateway('openai/gpt-5.2'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Visit this URL and extract the current product price. Return a JSON object with these fields:
- price: the current price as a number (not a string, just the numeric value), or null if price cannot be found
- currency: the currency code like USD, EUR, GBP, etc. (default USD if not found)

URL: ${url}

Return ONLY valid JSON in this exact format:
{ "price": number or null, "currency": "string" }

Do not include any markdown, explanations, or extra text.`,
            },
          ],
        },
      ],
    });

    const extracted = JSON.parse(result.text) as Record<string, any>;

    if (typeof extracted.price === 'number' || extracted.price === null) {
      return {
        price: extracted.price,
        currency: extracted.currency || 'USD',
      };
    }

    return null;
  } catch (error) {
    logger.warn({ err: error, url }, 'Failed to extract price from URL');
    return null;
  }
}

export function registerPriceRefreshRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/wishlists/:wishlistId/refresh-prices - Refresh prices for wishlist items
  app.fastify.post(
    '/api/wishlists/:wishlistId/refresh-prices',
    {
      schema: {
        description: 'Refresh prices for all items in a wishlist',
        tags: ['pricing'],
        params: {
          type: 'object',
          properties: {
            wishlistId: { type: 'string' },
          },
          required: ['wishlistId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              itemsChecked: { type: 'number' },
              itemsUpdated: { type: 'number' },
              priceDrops: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    itemId: { type: 'string' },
                    itemTitle: { type: 'string' },
                    oldPrice: { type: 'number' },
                    newPrice: { type: 'number' },
                    percentageChange: { type: 'number' },
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
        Params: { wishlistId: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { wishlistId } = request.params;

      app.logger.info(
        { wishlistId, userId },
        'Starting price refresh for wishlist'
      );

      try {
        // Verify ownership
        const wishlist = await app.db.query.wishlists.findFirst({
          where: eq(schema.wishlists.id, wishlistId),
        });

        if (!wishlist || wishlist.userId !== userId) {
          app.logger.warn({ wishlistId, userId }, 'Wishlist not found');
          return reply.status(404).send({ error: 'Wishlist not found' });
        }

        // Get all items with originalUrl
        const items = await app.db.query.wishlistItems.findMany({
          where: eq(schema.wishlistItems.wishlistId, wishlistId),
          with: {
            priceHistory: {
              orderBy: desc(schema.priceHistory.recordedAt),
              limit: 1,
            },
          },
        });

        const itemsWithUrl = items.filter((item) => item.originalUrl);

        app.logger.info(
          { wishlistId, itemCount: itemsWithUrl.length },
          'Found items with URLs to check'
        );

        let itemsChecked = 0;
        let itemsUpdated = 0;
        const priceDrops: Array<{
          itemId: string;
          itemTitle: string;
          oldPrice: number;
          newPrice: number;
          percentageChange: number;
        }> = [];

        // Check each item
        for (const item of itemsWithUrl) {
          if (!item.originalUrl) continue;

          const priceData = await extractPriceFromUrl(item.originalUrl, app.logger);

          if (priceData && priceData.price !== null) {
            itemsChecked++;

            const oldPrice = item.currentPrice ? parseFloat(item.currentPrice) : null;
            const newPrice = priceData.price;

            // Insert price history entry
            await app.db.insert(schema.priceHistory).values({
              itemId: item.id,
              price: newPrice.toString(),
              currency: priceData.currency,
            });

            // Update item with new price and last_checked_at
            await app.db
              .update(schema.wishlistItems)
              .set({
                currentPrice: newPrice.toString(),
                currency: priceData.currency,
                lastCheckedAt: new Date(),
              })
              .where(eq(schema.wishlistItems.id, item.id));

            app.logger.info(
              { itemId: item.id, oldPrice, newPrice },
              'Item price updated'
            );

            // Check for price drop
            if (oldPrice !== null && newPrice < oldPrice) {
              itemsUpdated++;
              const percentageChange = ((oldPrice - newPrice) / oldPrice) * 100;

              priceDrops.push({
                itemId: item.id,
                itemTitle: item.title,
                oldPrice,
                newPrice,
                percentageChange: parseFloat(percentageChange.toFixed(2)),
              });

              app.logger.info(
                {
                  itemId: item.id,
                  oldPrice,
                  newPrice,
                  percentageChange: percentageChange.toFixed(2),
                },
                'Price drop detected'
              );

              // Trigger notification asynchronously
              fetch(
                `http://localhost:${process.env.PORT || 3000}/api/notifications/send-price-drop`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    userId,
                    itemId: item.id,
                    itemTitle: item.title,
                    oldPrice,
                    newPrice,
                    currency: priceData.currency,
                  }),
                }
              ).catch((err) => {
                app.logger.warn(
                  { err, itemId: item.id },
                  'Failed to trigger price drop notification'
                );
              });
            } else if (oldPrice === null) {
              itemsUpdated++;
            }
          } else {
            itemsChecked++;

            // Update last_checked_at even if price extraction failed
            await app.db
              .update(schema.wishlistItems)
              .set({ lastCheckedAt: new Date() })
              .where(eq(schema.wishlistItems.id, item.id));

            app.logger.warn(
              { itemId: item.id, url: item.originalUrl },
              'Could not extract price from URL'
            );
          }
        }

        app.logger.info(
          {
            wishlistId,
            itemsChecked,
            itemsUpdated,
            priceDropsCount: priceDrops.length,
          },
          'Price refresh completed'
        );

        return {
          success: true,
          itemsChecked,
          itemsUpdated,
          priceDrops,
        };
      } catch (error) {
        app.logger.error(
          { err: error, wishlistId, userId },
          'Failed to refresh prices'
        );
        return reply.status(500).send({ error: 'Failed to refresh prices' });
      }
    }
  );

  // GET /api/items/:itemId/price-drop-info - Get price drop information
  app.fastify.get(
    '/api/items/:itemId/price-drop-info',
    {
      schema: {
        description: 'Get price drop information for an item',
        tags: ['pricing'],
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
              priceDropped: { type: 'boolean' },
              originalPrice: { type: 'number' },
              currentPrice: { type: 'number' },
              percentageChange: { type: 'number' },
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
      const { itemId } = request.params;

      app.logger.info({ itemId }, 'Fetching price drop info');

      try {
        // Get item with price history
        const item = await app.db.query.wishlistItems.findFirst({
          where: eq(schema.wishlistItems.id, itemId),
          with: {
            priceHistory: {
              orderBy: desc(schema.priceHistory.recordedAt),
            },
          },
        });

        if (!item) {
          app.logger.warn({ itemId }, 'Item not found');
          return reply.status(404).send({ error: 'Item not found' });
        }

        const currentPrice = item.currentPrice
          ? parseFloat(item.currentPrice)
          : null;
        let originalPrice: number | null = null;
        let priceDropped = false;
        let percentageChange: number | null = null;

        // Get original price from oldest price history entry
        if (item.priceHistory.length > 0) {
          originalPrice = parseFloat(
            item.priceHistory[item.priceHistory.length - 1].price
          );

          if (currentPrice !== null && originalPrice > 0) {
            priceDropped = currentPrice < originalPrice;
            percentageChange =
              ((originalPrice - currentPrice) / originalPrice) * 100;
            percentageChange = parseFloat(percentageChange.toFixed(2));
          }
        } else if (currentPrice !== null) {
          // No history, use current price as original
          originalPrice = currentPrice;
        }

        app.logger.info(
          {
            itemId,
            originalPrice,
            currentPrice,
            priceDropped,
            percentageChange,
          },
          'Price drop info retrieved'
        );

        return {
          priceDropped,
          originalPrice,
          currentPrice,
          percentageChange,
        };
      } catch (error) {
        app.logger.error(
          { err: error, itemId },
          'Failed to get price drop info'
        );
        return reply.status(500).send({ error: 'Failed to get price drop info' });
      }
    }
  );
}
