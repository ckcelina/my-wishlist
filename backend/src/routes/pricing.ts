import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerPricingRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Helper function to extract price from URL
  async function extractPriceFromUrl(
    url: string
  ): Promise<{ price: number | null; currency: string } | null> {
    try {
      app.logger.info({ url }, 'Extracting price from URL');

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

      const extracted = JSON.parse(result.text);

      if (
        typeof extracted.price === 'number' ||
        extracted.price === null
      ) {
        return {
          price: extracted.price,
          currency: extracted.currency || 'USD',
        };
      }

      return null;
    } catch (error) {
      app.logger.warn(
        { err: error, url },
        'Failed to extract price from URL'
      );
      return null;
    }
  }

  // POST /api/items/check-prices - Check prices for all items with originalUrl
  app.fastify.post(
    '/api/items/check-prices',
    {
      schema: {
        description: 'Check prices for all items with original URL',
        tags: ['pricing'],
        response: {
          200: {
            type: 'object',
            properties: {
              checkedCount: { type: 'number' },
              updatedCount: { type: 'number' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, 'Starting bulk price check');

      try {
        // Get all items with originalUrl for this user
        const items = await app.db.query.wishlistItems.findMany({
          where: (item, { isNotNull }) => isNotNull(item.originalUrl),
          with: {
            wishlist: true,
          },
        });

        // Filter items belonging to this user
        const userItems = items.filter((item) => item.wishlist.userId === userId);

        app.logger.info(
          { userId, itemCount: userItems.length },
          'Found items to check'
        );

        let checkedCount = 0;
        let updatedCount = 0;

        // Check each item
        for (const item of userItems) {
          if (!item.originalUrl) continue;

          const priceData = await extractPriceFromUrl(item.originalUrl);

          if (priceData && priceData.price !== null) {
            checkedCount++;

            // Add to price history
            await app.db.insert(schema.priceHistory).values({
              itemId: item.id,
              price: priceData.price.toString(),
              currency: priceData.currency,
            });

            app.logger.info(
              { itemId: item.id, newPrice: priceData.price },
              'Price recorded in history'
            );

            // Check if price changed
            if (
              item.currentPrice &&
              parseFloat(item.currentPrice) !== priceData.price
            ) {
              updatedCount++;

              // Update current price
              await app.db
                .update(schema.wishlistItems)
                .set({
                  currentPrice: priceData.price.toString(),
                  lastCheckedAt: new Date(),
                })
                .where(eq(schema.wishlistItems.id, item.id));

              app.logger.info(
                {
                  itemId: item.id,
                  oldPrice: item.currentPrice,
                  newPrice: priceData.price,
                },
                'Item price updated'
              );
            } else {
              // Just update last_checked_at
              await app.db
                .update(schema.wishlistItems)
                .set({ lastCheckedAt: new Date() })
                .where(eq(schema.wishlistItems.id, item.id));
            }
          } else {
            app.logger.warn(
              { itemId: item.id, url: item.originalUrl },
              'Could not extract price from URL'
            );

            // Still update last_checked_at even if price extraction failed
            await app.db
              .update(schema.wishlistItems)
              .set({ lastCheckedAt: new Date() })
              .where(eq(schema.wishlistItems.id, item.id));

            checkedCount++;
          }
        }

        app.logger.info(
          { checkedCount, updatedCount },
          'Bulk price check completed'
        );

        return {
          checkedCount,
          updatedCount,
          message: `Checked ${checkedCount} items, ${updatedCount} prices changed`,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to check prices'
        );
        return reply.status(500).send({ error: 'Failed to check prices' });
      }
    }
  );

  // POST /api/items/:id/check-price - Check price for a single item
  app.fastify.post(
    '/api/items/:id/check-price',
    {
      schema: {
        description: 'Check price for a single item',
        tags: ['pricing'],
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
              priceChanged: { type: 'boolean' },
              oldPrice: { type: 'number' },
              newPrice: { type: 'number' },
              lastCheckedAt: { type: 'string' },
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

      app.logger.info({ itemId: id, userId }, 'Checking price for single item');

      try {
        // Fetch item with ownership verification
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

        if (!item.originalUrl) {
          app.logger.warn({ itemId: id }, 'Item has no originalUrl');
          return reply.status(400).send({
            error: 'Item does not have an original URL',
          });
        }

        const priceData = await extractPriceFromUrl(item.originalUrl);

        if (!priceData || priceData.price === null) {
          app.logger.warn(
            { itemId: id, url: item.originalUrl },
            'Could not extract price'
          );

          // Update last_checked_at even if extraction failed
          await app.db
            .update(schema.wishlistItems)
            .set({ lastCheckedAt: new Date() })
            .where(eq(schema.wishlistItems.id, id));

          return {
            success: false,
            priceChanged: false,
            oldPrice: item.currentPrice ? parseFloat(item.currentPrice) : null,
            newPrice: null,
            lastCheckedAt: new Date().toISOString(),
          };
        }

        // Add to price history
        await app.db.insert(schema.priceHistory).values({
          itemId: id,
          price: priceData.price.toString(),
          currency: priceData.currency,
        });

        const oldPrice = item.currentPrice
          ? parseFloat(item.currentPrice)
          : null;
        const priceChanged =
          oldPrice !== null && oldPrice !== priceData.price;

        // Update item
        const [updated] = await app.db
          .update(schema.wishlistItems)
          .set({
            currentPrice: priceData.price.toString(),
            lastCheckedAt: new Date(),
          })
          .where(eq(schema.wishlistItems.id, id))
          .returning();

        app.logger.info(
          {
            itemId: id,
            oldPrice,
            newPrice: priceData.price,
            changed: priceChanged,
          },
          'Single item price checked'
        );

        return {
          success: true,
          priceChanged,
          oldPrice,
          newPrice: priceData.price,
          lastCheckedAt: updated.lastCheckedAt?.toISOString() || new Date().toISOString(),
        };
      } catch (error) {
        app.logger.error(
          { err: error, itemId: id },
          'Failed to check price'
        );
        return reply.status(500).send({ error: 'Failed to check price' });
      }
    }
  );

  // GET /api/items/:id/price-dropped - Check if price has decreased since item creation
  app.fastify.get(
    '/api/items/:id/price-dropped',
    {
      schema: {
        description: 'Check if price has decreased since item was created',
        tags: ['pricing'],
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
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      app.logger.info({ itemId: id }, 'Checking price drop');

      try {
        // Fetch item with price history
        const item = await app.db.query.wishlistItems.findFirst({
          where: eq(schema.wishlistItems.id, id),
          with: {
            priceHistory: {
              orderBy: (ph) => ph.recordedAt,
            },
          },
        });

        if (!item) {
          app.logger.warn({ itemId: id }, 'Item not found');
          return reply.status(404).send({ error: 'Item not found' });
        }

        const currentPrice = item.currentPrice
          ? parseFloat(item.currentPrice)
          : null;

        // Get original price (first price in history or current price if no history)
        let originalPrice: number | null = null;

        if (item.priceHistory.length > 0) {
          originalPrice = parseFloat(item.priceHistory[0].price);
        } else if (currentPrice !== null) {
          originalPrice = currentPrice;
        }

        let priceDropped = false;
        let percentageChange: number | null = null;

        if (
          originalPrice !== null &&
          currentPrice !== null &&
          originalPrice > 0
        ) {
          priceDropped = currentPrice < originalPrice;
          percentageChange =
            ((currentPrice - originalPrice) / originalPrice) * 100;
        }

        app.logger.info(
          {
            itemId: id,
            originalPrice,
            currentPrice,
            percentageChange: percentageChange?.toFixed(2),
            dropped: priceDropped,
          },
          'Price drop check completed'
        );

        return {
          priceDropped,
          originalPrice,
          currentPrice,
          percentageChange: percentageChange
            ? parseFloat(percentageChange.toFixed(2))
            : null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, itemId: id },
          'Failed to check price drop'
        );
        return reply.status(500).send({ error: 'Failed to check price drop' });
      }
    }
  );
}
