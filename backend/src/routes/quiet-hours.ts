import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

// Parse time in "HH:MM" format to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Get minutes since midnight for current time
function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// Check if current time is within quiet hours
function isInQuietHours(startTime: string, endTime: string): boolean {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const currentMin = getCurrentMinutes();

  if (startMin < endMin) {
    // Normal case: e.g., 22:00 to 08:00 doesn't cross midnight
    return currentMin >= startMin && currentMin < endMin;
  } else {
    // Crosses midnight: e.g., 22:00 to 08:00
    return currentMin >= startMin || currentMin < endMin;
  }
}

// Calculate next send time (end of quiet hours)
function getNextSendTime(endTime: string): Date {
  const nextSend = new Date();
  const [hours, minutes] = endTime.split(':').map(Number);
  nextSend.setHours(hours, minutes, 0, 0);

  // If already passed today, set for tomorrow
  if (nextSend <= new Date()) {
    nextSend.setDate(nextSend.getDate() + 1);
  }

  return nextSend;
}

export function registerQuietHoursRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/users/quiet-hours - Get quiet hours settings
  app.fastify.get(
    '/api/users/quiet-hours',
    {
      schema: {
        description: 'Get quiet hours settings',
        tags: ['users'],
        response: {
          200: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              startTime: { type: ['string', 'null'] },
              endTime: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Fetching quiet hours');

      try {
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

        return {
          enabled: settings.quietHoursEnabled,
          startTime: settings.quietHoursStartTime || null,
          endTime: settings.quietHoursEndTime || null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to fetch quiet hours'
        );
        return reply.status(500).send({ error: 'Failed to fetch quiet hours' });
      }
    }
  );

  // PUT /api/users/quiet-hours - Update quiet hours settings
  app.fastify.put(
    '/api/users/quiet-hours',
    {
      schema: {
        description: 'Update quiet hours settings',
        tags: ['users'],
        body: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              startTime: { type: ['string', 'null'] },
              endTime: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          enabled: boolean;
          startTime?: string;
          endTime?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { enabled, startTime, endTime } = request.body;

      app.logger.info(
        { userId, enabled, startTime, endTime },
        'Updating quiet hours'
      );

      try {
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

        const updateData: any = { quietHoursEnabled: enabled };
        if (startTime !== undefined) updateData.quietHoursStartTime = startTime || null;
        if (endTime !== undefined) updateData.quietHoursEndTime = endTime || null;

        const [updated] = await app.db
          .update(schema.userSettings)
          .set(updateData)
          .where(eq(schema.userSettings.userId, userId))
          .returning();

        app.logger.info({ userId }, 'Quiet hours updated');

        return {
          enabled: updated.quietHoursEnabled,
          startTime: updated.quietHoursStartTime || null,
          endTime: updated.quietHoursEndTime || null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to update quiet hours'
        );
        return reply.status(500).send({ error: 'Failed to update quiet hours' });
      }
    }
  );

  // POST /api/notifications/check-quiet-hours - Check if in quiet hours
  app.fastify.post(
    '/api/notifications/check-quiet-hours',
    {
      schema: {
        description: 'Check if user is in quiet hours',
        tags: ['notifications'],
        body: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              inQuietHours: { type: 'boolean' },
              nextSendTime: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          userId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { userId } = request.body;

      app.logger.info({ userId }, 'Checking quiet hours');

      try {
        const settings = await app.db.query.userSettings.findFirst({
          where: eq(schema.userSettings.userId, userId),
        });

        if (
          !settings ||
          !settings.quietHoursEnabled ||
          !settings.quietHoursStartTime ||
          !settings.quietHoursEndTime
        ) {
          return {
            inQuietHours: false,
            nextSendTime: null,
          };
        }

        const inQuiet = isInQuietHours(
          settings.quietHoursStartTime,
          settings.quietHoursEndTime
        );

        return {
          inQuietHours: inQuiet,
          nextSendTime: inQuiet
            ? getNextSendTime(settings.quietHoursEndTime).toISOString()
            : null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to check quiet hours'
        );
        return reply.status(500).send({ error: 'Failed to check quiet hours' });
      }
    }
  );
}
