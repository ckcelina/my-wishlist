import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

// Expo Push Notification API endpoint
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string | string[];
  sound?: string;
  title: string;
  body: string;
  data?: Record<string, string | number>;
  priority?: 'default' | 'normal' | 'high';
}

async function sendExpoPushNotification(
  message: ExpoPushMessage,
  logger: any
): Promise<boolean> {
  try {
    logger.info(
      { pushToken: message.to, title: message.title },
      'Sending Expo push notification'
    );

    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.warn(
        { status: response.status, error },
        'Expo push notification failed'
      );
      return false;
    }

    const result = await response.json() as Record<string, any>;

    if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
      logger.warn(
        { errors: result.errors },
        'Expo API returned errors'
      );
      return false;
    }

    logger.info(
      { responseData: result.data },
      'Expo push notification sent successfully'
    );
    return true;
  } catch (error) {
    logger.error(
      { err: error },
      'Failed to send Expo push notification'
    );
    return false;
  }
}

export function registerNotificationRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/notifications/send-price-drop - Send price drop notification
  app.fastify.post(
    '/api/notifications/send-price-drop',
    {
      schema: {
        description: 'Send price drop notification to user (internal endpoint)',
        tags: ['notifications'],
        body: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            itemId: { type: 'string' },
            itemTitle: { type: 'string' },
            oldPrice: { type: 'number' },
            newPrice: { type: 'number' },
            currency: { type: 'string' },
          },
          required: [
            'userId',
            'itemId',
            'itemTitle',
            'oldPrice',
            'newPrice',
            'currency',
          ],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              sent: { type: 'boolean' },
              message: { type: 'string' },
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
          itemTitle: string;
          oldPrice: number;
          newPrice: number;
          currency: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { userId, itemId, itemTitle, oldPrice, newPrice, currency } =
        request.body;

      app.logger.info(
        {
          userId,
          itemId,
          itemTitle,
          oldPrice,
          newPrice,
        },
        'Processing price drop notification'
      );

      try {
        // Get user settings
        const settings = await app.db.query.userSettings.findFirst({
          where: eq(schema.userSettings.userId, userId),
        });

        if (!settings) {
          app.logger.info({ userId }, 'User has no settings configured');
          return {
            success: true,
            sent: false,
            message: 'User settings not found',
          };
        }

        if (!settings.priceDropAlertsEnabled) {
          app.logger.info(
            { userId },
            'Price drop alerts disabled for user'
          );
          return {
            success: true,
            sent: false,
            message: 'Price drop alerts disabled',
          };
        }

        if (!settings.expoPushToken) {
          app.logger.info({ userId }, 'User has no Expo push token');
          return {
            success: true,
            sent: false,
            message: 'No push token configured',
          };
        }

        // Prepare notification message
        const percentageChange = (
          ((newPrice - oldPrice) / oldPrice) *
          100
        ).toFixed(1);
        const notificationTitle = 'Price Drop Alert!';
        const notificationBody = `${itemTitle} dropped to ${currency}${newPrice.toFixed(2)} (was ${currency}${oldPrice.toFixed(2)}) - ${percentageChange}% decrease`;

        // Send Expo push notification
        const sent = await sendExpoPushNotification(
          {
            to: settings.expoPushToken,
            sound: 'default',
            title: notificationTitle,
            body: notificationBody,
            data: {
              itemId,
              url: `/item/${itemId}`,
            },
            priority: 'high',
          },
          app.logger
        );

        app.logger.info(
          { userId, itemId, sent },
          'Price drop notification processed'
        );

        return {
          success: true,
          sent,
          message: sent
            ? 'Notification sent successfully'
            : 'Failed to send notification',
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, itemId },
          'Failed to process price drop notification'
        );
        return {
          success: false,
          sent: false,
          message: 'Error processing notification',
        };
      }
    }
  );

  // GET /api/users/settings - Get user settings
  app.fastify.get(
    '/api/users/settings',
    {
      schema: {
        description: 'Get user notification settings',
        tags: ['users', 'settings'],
        response: {
          200: {
            type: 'object',
            properties: {
              priceDropAlertsEnabled: { type: 'boolean' },
              defaultCurrency: { type: 'string' },
              expoPushToken: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, 'Fetching user settings');

      try {
        let settings = await app.db.query.userSettings.findFirst({
          where: eq(schema.userSettings.userId, userId),
        });

        // Create default settings if they don't exist
        if (!settings) {
          app.logger.info(
            { userId },
            'Creating default user settings'
          );

          const [created] = await app.db
            .insert(schema.userSettings)
            .values({
              userId,
              priceDropAlertsEnabled: false,
              defaultCurrency: 'USD',
            })
            .returning();

          settings = created;
        }

        app.logger.info(
          { userId, alertsEnabled: settings.priceDropAlertsEnabled, currency: settings.defaultCurrency },
          'User settings retrieved'
        );

        return {
          priceDropAlertsEnabled: settings.priceDropAlertsEnabled,
          defaultCurrency: settings.defaultCurrency,
          expoPushToken: settings.expoPushToken || null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to fetch user settings'
        );
        return reply.status(500).send({ error: 'Failed to fetch settings' });
      }
    }
  );

  // PUT /api/users/settings - Update user settings
  app.fastify.put(
    '/api/users/settings',
    {
      schema: {
        description: 'Update user notification settings',
        tags: ['users', 'settings'],
        body: {
          type: 'object',
          properties: {
            priceDropAlertsEnabled: { type: 'boolean' },
            defaultCurrency: { type: 'string' },
            expoPushToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              priceDropAlertsEnabled: { type: 'boolean' },
              defaultCurrency: { type: 'string' },
              expoPushToken: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          priceDropAlertsEnabled?: boolean;
          defaultCurrency?: string;
          expoPushToken?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { priceDropAlertsEnabled, defaultCurrency, expoPushToken } = request.body;

      app.logger.info(
        { userId, alertsEnabled: priceDropAlertsEnabled, currency: defaultCurrency },
        'Updating user settings'
      );

      try {
        // Get or create settings
        let settings = await app.db.query.userSettings.findFirst({
          where: eq(schema.userSettings.userId, userId),
        });

        if (!settings) {
          const [created] = await app.db
            .insert(schema.userSettings)
            .values({
              userId,
              priceDropAlertsEnabled:
                priceDropAlertsEnabled !== undefined
                  ? priceDropAlertsEnabled
                  : false,
              defaultCurrency: defaultCurrency || 'USD',
              expoPushToken: expoPushToken || null,
            })
            .returning();

          settings = created;
        } else {
          // Update existing settings
          const updateData: any = {};
          if (priceDropAlertsEnabled !== undefined) {
            updateData.priceDropAlertsEnabled = priceDropAlertsEnabled;
          }
          if (defaultCurrency !== undefined) {
            updateData.defaultCurrency = defaultCurrency;
          }
          if (expoPushToken !== undefined) {
            updateData.expoPushToken = expoPushToken || null;
          }

          const [updated] = await app.db
            .update(schema.userSettings)
            .set(updateData)
            .where(eq(schema.userSettings.userId, userId))
            .returning();

          settings = updated;
        }

        app.logger.info(
          { userId, alertsEnabled: settings.priceDropAlertsEnabled, currency: settings.defaultCurrency },
          'User settings updated'
        );

        return {
          priceDropAlertsEnabled: settings.priceDropAlertsEnabled,
          defaultCurrency: settings.defaultCurrency,
          expoPushToken: settings.expoPushToken || null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to update user settings'
        );
        return reply.status(500).send({ error: 'Failed to update settings' });
      }
    }
  );

  // POST /api/users/push-token - Update Expo push notification token
  app.fastify.post(
    '/api/users/push-token',
    {
      schema: {
        description: 'Update Expo push notification token',
        tags: ['users', 'notifications'],
        body: {
          type: 'object',
          properties: {
            expoPushToken: { type: 'string' },
          },
          required: ['expoPushToken'],
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
          expoPushToken: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { expoPushToken } = request.body;

      app.logger.info({ userId }, 'Updating Expo push token');

      try {
        // Get or create settings
        let settings = await app.db.query.userSettings.findFirst({
          where: eq(schema.userSettings.userId, userId),
        });

        if (!settings) {
          app.logger.info({ userId }, 'Creating default user settings');

          const [created] = await app.db
            .insert(schema.userSettings)
            .values({
              userId,
              priceDropAlertsEnabled: false,
              defaultCurrency: 'USD',
              expoPushToken,
            })
            .returning();

          settings = created;
        } else {
          // Update existing settings with new push token
          const [updated] = await app.db
            .update(schema.userSettings)
            .set({ expoPushToken })
            .where(eq(schema.userSettings.userId, userId))
            .returning();

          settings = updated;
        }

        app.logger.info({ userId }, 'Expo push token updated successfully');

        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to update push token'
        );
        return reply.status(500).send({ error: 'Failed to update push token' });
      }
    }
  );
}
