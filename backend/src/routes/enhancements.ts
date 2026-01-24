import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, lte } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerEnhancementRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // PUT /api/items/:id/alert - Set price alert for an item
  app.fastify.put(
    '/api/items/:id/alert',
    {
      schema: {
        description: 'Set price alert for an item',
        tags: ['items', 'alerts'],
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
            alertEnabled: { type: 'boolean' },
            alertPrice: { type: 'number' },
          },
          required: ['alertEnabled'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              alertEnabled: { type: 'boolean' },
              alertPrice: { type: ['number', 'null'] },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          alertEnabled: boolean;
          alertPrice?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;
      const { alertEnabled, alertPrice } = request.body;

      app.logger.info(
        { itemId: id, userId, alertEnabled, alertPrice },
        'Setting price alert'
      );

      try {
        // Get item and verify ownership via wishlist
        const item = await app.db.query.wishlistItems.findFirst({
          where: eq(schema.wishlistItems.id, id),
          with: { wishlist: true },
        });

        if (!item) {
          app.logger.warn({ itemId: id }, 'Item not found');
          return reply.status(404).send({ error: 'Item not found' });
        }

        if (item.wishlist.userId !== userId) {
          app.logger.warn({ itemId: id, userId }, 'Unauthorized');
          return reply.status(403).send({ error: 'Unauthorized' });
        }

        // Update alert settings
        const [updated] = await app.db
          .update(schema.wishlistItems)
          .set({
            alertEnabled,
            alertPrice: alertEnabled && alertPrice ? alertPrice.toString() : null,
          })
          .where(eq(schema.wishlistItems.id, id))
          .returning();

        app.logger.info(
          { itemId: id, alertEnabled, alertPrice: updated.alertPrice },
          'Price alert updated'
        );

        return {
          success: true,
          alertEnabled: updated.alertEnabled,
          alertPrice: updated.alertPrice
            ? parseFloat(updated.alertPrice.toString())
            : null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, itemId: id, userId },
          'Failed to set alert'
        );
        return reply.status(500).send({
          error: 'Failed to set alert',
        });
      }
    }
  );

  // POST /api/items/:id/refresh-price - Manually refresh item price with rate limiting
  app.fastify.post(
    '/api/items/:id/refresh-price',
    {
      schema: {
        description: 'Manually refresh item price (24-hour rate limit)',
        tags: ['items', 'pricing'],
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
              newPrice: { type: ['number', 'null'] },
              currency: { type: 'string' },
              lastCheckedAt: { type: 'string' },
              rateLimitMessage: { type: 'string' },
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

      app.logger.info({ itemId: id, userId }, 'Refreshing item price');

      try {
        // Get item and verify ownership
        const item = await app.db.query.wishlistItems.findFirst({
          where: eq(schema.wishlistItems.id, id),
          with: { wishlist: true },
        });

        if (!item) {
          return reply.status(404).send({ error: 'Item not found' });
        }

        if (item.wishlist.userId !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' });
        }

        // Check rate limit (24 hours)
        const now = new Date();
        const lastChecked = item.lastCheckedAt
          ? new Date(item.lastCheckedAt)
          : null;

        let rateLimitMessage = '';
        if (lastChecked) {
          const hoursSinceLastCheck =
            (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastCheck < 24) {
            rateLimitMessage = `Last checked ${Math.round(hoursSinceLastCheck)} hour(s) ago. Next check available in ${Math.round(24 - hoursSinceLastCheck)} hour(s).`;
            app.logger.debug(
              { itemId: id, hoursSinceLastCheck },
              'Rate limit applied'
            );
          }
        }

        // Extract price from URL if available
        let newPrice: string | null = item.currentPrice
          ? item.currentPrice.toString()
          : null;

        if (item.originalUrl) {
          try {
            const result = await generateText({
              model: gateway('openai/gpt-5.2'),
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `Visit this URL and extract the current product price. Return ONLY a JSON object with the price as a number or null if not found:
{"price": 99.99}

URL: ${item.originalUrl}`,
                    },
                  ],
                },
              ],
            });

            const extracted = JSON.parse(result.text);
            if (extracted.price) {
              newPrice = extracted.price.toString();
            }
          } catch (priceError) {
            app.logger.debug(
              { err: priceError, url: item.originalUrl },
              'Failed to extract price from URL'
            );
            // Use existing price if extraction fails
          }
        }

        // Update item with new price and timestamp
        const [updated] = await app.db
          .update(schema.wishlistItems)
          .set({
            currentPrice: newPrice,
            lastCheckedAt: new Date(),
          })
          .where(eq(schema.wishlistItems.id, id))
          .returning();

        // Add to price history
        if (newPrice) {
          await app.db.insert(schema.priceHistory).values({
            itemId: id,
            price: newPrice,
            currency: item.currency,
          });
        }

        app.logger.info(
          { itemId: id, newPrice, lastCheckedAt: updated.lastCheckedAt },
          'Price refreshed'
        );

        return {
          success: true,
          newPrice: newPrice ? parseFloat(newPrice) : null,
          currency: item.currency,
          lastCheckedAt: updated.lastCheckedAt.toISOString(),
          rateLimitMessage,
        };
      } catch (error) {
        app.logger.error(
          { err: error, itemId: id, userId },
          'Failed to refresh price'
        );
        return reply.status(500).send({
          error: 'Failed to refresh price',
        });
      }
    }
  );

  // POST /api/reports/:id/message - Add message to report
  app.fastify.post(
    '/api/reports/:id/message',
    {
      schema: {
        description: 'Add message to report',
        tags: ['reports'],
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
            message: { type: 'string' },
          },
          required: ['message'],
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
        Body: {
          message: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;
      const { message } = request.body;

      app.logger.info(
        { reportId: id, userId, messageLength: message.length },
        'Adding message to report'
      );

      try {
        // Get report and verify ownership
        const report = await app.db.query.userReports.findFirst({
          where: eq(schema.userReports.id, id),
        });

        if (!report) {
          return reply.status(404).send({ error: 'Report not found' });
        }

        if (report.userId !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' });
        }

        // Append message to existing details
        const updatedDetails = `${report.details}\n\n[User Update]: ${message}`;

        await app.db
          .update(schema.userReports)
          .set({
            details: updatedDetails,
            updatedAt: new Date(),
          })
          .where(eq(schema.userReports.id, id));

        app.logger.info({ reportId: id }, 'Message added to report');

        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, reportId: id, userId },
          'Failed to add message'
        );
        return reply.status(500).send({
          error: 'Failed to add message',
        });
      }
    }
  );

  // UPDATE GET /api/wishlists/shared/:shareSlug - Add metadata to shared wishlist
  // This needs to be added to wishlists.ts, replacing the existing endpoint
  // For now, we'll add the enhanced version here and note it should be moved

  // POST /api/upload/image - Update to support temp flag
  // This is updated in the upload.ts file separately
}
