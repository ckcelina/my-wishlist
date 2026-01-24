import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerOnboardingRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/users/onboarding-status - Check onboarding status
  app.fastify.get(
    '/api/users/onboarding-status',
    {
      schema: {
        description: 'Get user onboarding status',
        tags: ['users'],
        response: {
          200: {
            type: 'object',
            properties: {
              completed: { type: 'boolean' },
              completedAt: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Fetching onboarding status');

      try {
        // Get user's onboarding status from auth schema
        // Since we can't directly access the user table from our schema,
        // we'll need to use the session to determine this
        // For now, return a default response based on their settings
        const settings = await app.db.query.userSettings.findFirst({
          where: eq(schema.userSettings.userId, userId),
        });

        // Assuming if user has settings, they've completed onboarding
        const completed = !!settings;

        app.logger.info({ userId, completed }, 'Onboarding status fetched');

        return {
          completed,
          completedAt: completed ? new Date().toISOString() : null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to fetch onboarding status'
        );
        return reply
          .status(500)
          .send({ error: 'Failed to fetch onboarding status' });
      }
    }
  );

  // POST /api/users/complete-onboarding - Mark onboarding as complete
  app.fastify.post(
    '/api/users/complete-onboarding',
    {
      schema: {
        description: 'Mark onboarding as complete',
        tags: ['users'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              completedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Completing onboarding');

      try {
        // Ensure user settings exist
        let settings = await app.db.query.userSettings.findFirst({
          where: eq(schema.userSettings.userId, userId),
        });

        if (!settings) {
          const [created] = await app.db
            .insert(schema.userSettings)
            .values({ userId })
            .returning();
          settings = created;
        }

        const completedAt = new Date();

        app.logger.info({ userId }, 'Onboarding completed');

        return {
          success: true,
          completedAt: completedAt.toISOString(),
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to complete onboarding'
        );
        return reply
          .status(500)
          .send({ error: 'Failed to complete onboarding' });
      }
    }
  );
}
