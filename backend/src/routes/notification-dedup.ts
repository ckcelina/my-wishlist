import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const SIGNIFICANT_DROP_THRESHOLD = 0.05; // 5%

export function registerNotificationDedupeRoutes(app: App) {
  // POST /api/notifications/check-dedupe - Check if notification should be sent
  app.fastify.post(
    '/api/notifications/check-dedupe',
    {
      schema: {
        description: 'Check if notification has been sent recently',
        tags: ['notifications'],
        body: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            itemId: { type: 'string' },
            type: { type: 'string' },
            currentPrice: { type: 'number' },
            previousPrice: { type: 'number' },
          },
          required: ['userId', 'itemId', 'type'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              shouldSend: { type: 'boolean' },
              lastSentAt: { type: ['string', 'null'] },
              reason: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          userId: string;
          itemId: string;
          type: string;
          currentPrice?: number;
          previousPrice?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { userId, itemId, type, currentPrice, previousPrice } = request.body;

      app.logger.info(
        { userId, itemId, type },
        'Checking notification dedupe'
      );

      try {
        const lastSent = await app.db.query.notificationDedupe.findFirst({
          where: and(
            eq(schema.notificationDedupe.userId, userId),
            eq(schema.notificationDedupe.itemId, itemId),
            eq(schema.notificationDedupe.type, type)
          ),
        });

        if (!lastSent) {
          app.logger.info(
            { userId, itemId, type },
            'No previous notification found'
          );
          return {
            shouldSend: true,
            lastSentAt: null,
            reason: 'No previous notification',
          };
        }

        const timeSinceLastSent = Date.now() - lastSent.lastSentAt.getTime();

        // If outside dedupe window, allow sending
        if (timeSinceLastSent > DEDUPE_WINDOW_MS) {
          app.logger.info(
            { userId, itemId, type, timeSince: timeSinceLastSent },
            'Outside dedupe window, allowing notification'
          );
          return {
            shouldSend: true,
            lastSentAt: lastSent.lastSentAt.toISOString(),
            reason: '24-hour window expired',
          };
        }

        // Within dedupe window - check for significant price drop
        if (
          currentPrice !== undefined &&
          previousPrice !== undefined &&
          previousPrice > 0
        ) {
          const percentDrop = (previousPrice - currentPrice) / previousPrice;
          if (percentDrop >= SIGNIFICANT_DROP_THRESHOLD) {
            app.logger.info(
              { userId, itemId, percentDrop },
              'Significant price drop detected, allowing notification'
            );
            return {
              shouldSend: true,
              lastSentAt: lastSent.lastSentAt.toISOString(),
              reason: `Significant drop (${(percentDrop * 100).toFixed(1)}%)`,
            };
          }
        }

        app.logger.info(
          { userId, itemId, type },
          'Notification dedupe blocked'
        );
        return {
          shouldSend: false,
          lastSentAt: lastSent.lastSentAt.toISOString(),
          reason: 'Duplicate within 24 hours',
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, itemId },
          'Failed to check dedupe'
        );
        return reply.status(500).send({
          error: 'Failed to check dedupe',
        });
      }
    }
  );

  // POST /api/notifications/record-sent - Record that notification was sent
  app.fastify.post(
    '/api/notifications/record-sent',
    {
      schema: {
        description: 'Record that a notification was sent',
        tags: ['notifications'],
        body: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            itemId: { type: 'string' },
            type: { type: 'string' },
          },
          required: ['userId', 'itemId', 'type'],
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
        Body: {
          userId: string;
          itemId: string;
          type: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { userId, itemId, type } = request.body;

      app.logger.info(
        { userId, itemId, type },
        'Recording sent notification'
      );

      try {
        const existing = await app.db.query.notificationDedupe.findFirst({
          where: and(
            eq(schema.notificationDedupe.userId, userId),
            eq(schema.notificationDedupe.itemId, itemId),
            eq(schema.notificationDedupe.type, type)
          ),
        });

        if (existing) {
          await app.db
            .update(schema.notificationDedupe)
            .set({ lastSentAt: new Date() })
            .where(eq(schema.notificationDedupe.id, existing.id));
        } else {
          await app.db.insert(schema.notificationDedupe).values({
            userId,
            itemId,
            type,
            lastSentAt: new Date(),
          });
        }

        app.logger.info(
          { userId, itemId, type },
          'Notification sent recorded'
        );

        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, userId, itemId },
          'Failed to record sent notification'
        );
        return reply.status(500).send({
          error: 'Failed to record notification',
        });
      }
    }
  );
}
