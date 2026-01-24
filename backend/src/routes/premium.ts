import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerPremiumRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/premium/status - Get user premium status
  app.fastify.get(
    '/api/premium/status',
    {
      schema: {
        description: 'Get user premium subscription status',
        tags: ['premium'],
        response: {
          200: {
            type: 'object',
            properties: {
              isPremium: { type: 'boolean' },
              planName: { type: ['string', 'null'] },
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
      app.logger.info({ userId }, 'Fetching premium status');

      try {
        let entitlements = await app.db.query.userEntitlements.findFirst({
          where: eq(schema.userEntitlements.userId, userId),
        });

        // Create default entitlements if not exists
        if (!entitlements) {
          const [created] = await app.db
            .insert(schema.userEntitlements)
            .values({
              userId,
              isPremium: false,
            })
            .returning();
          entitlements = created;
          app.logger.info({ userId }, 'Default entitlements created');
        }

        app.logger.info(
          { userId, isPremium: entitlements.isPremium, planName: entitlements.planName },
          'Premium status retrieved'
        );

        return {
          isPremium: entitlements.isPremium,
          planName: entitlements.planName || null,
          updatedAt: entitlements.updatedAt.toISOString(),
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to fetch premium status'
        );
        return reply.status(500).send({ error: 'Failed to fetch premium status' });
      }
    }
  );

  // POST /api/premium/upgrade - Upgrade to premium (placeholder, no billing)
  app.fastify.post(
    '/api/premium/upgrade',
    {
      schema: {
        description: 'Upgrade to premium plan (placeholder)',
        tags: ['premium'],
        body: {
          type: 'object',
          properties: {
            planName: { type: 'string' },
          },
          required: ['planName'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              isPremium: { type: 'boolean' },
              planName: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          planName: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { planName } = request.body;

      app.logger.info(
        { userId, planName },
        'premium_upgrade_clicked'
      );

      try {
        let entitlements = await app.db.query.userEntitlements.findFirst({
          where: eq(schema.userEntitlements.userId, userId),
        });

        if (!entitlements) {
          const [created] = await app.db
            .insert(schema.userEntitlements)
            .values({
              userId,
              isPremium: true,
              planName,
            })
            .returning();
          entitlements = created;
        } else {
          const [updated] = await app.db
            .update(schema.userEntitlements)
            .set({
              isPremium: true,
              planName,
            })
            .where(eq(schema.userEntitlements.userId, userId))
            .returning();
          entitlements = updated;
        }

        app.logger.info(
          { userId, planName },
          'premium_upgrade_completed'
        );

        return {
          success: true,
          isPremium: true,
          planName,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, planName },
          'Failed to upgrade premium'
        );
        return reply.status(500).send({ error: 'Failed to upgrade premium' });
      }
    }
  );

  // POST /api/premium/restore - Restore premium status (placeholder)
  app.fastify.post(
    '/api/premium/restore',
    {
      schema: {
        description: 'Restore premium status (placeholder)',
        tags: ['premium'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              isPremium: { type: 'boolean' },
              planName: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info(
        { userId },
        'premium_restore_clicked'
      );

      try {
        let entitlements = await app.db.query.userEntitlements.findFirst({
          where: eq(schema.userEntitlements.userId, userId),
        });

        if (!entitlements) {
          const [created] = await app.db
            .insert(schema.userEntitlements)
            .values({
              userId,
              isPremium: false,
            })
            .returning();
          entitlements = created;
        }

        app.logger.info(
          { userId, isPremium: entitlements.isPremium },
          'Premium restore completed'
        );

        return {
          success: true,
          isPremium: entitlements.isPremium,
          planName: entitlements.planName || null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to restore premium'
        );
        return reply.status(500).send({ error: 'Failed to restore premium' });
      }
    }
  );
}
