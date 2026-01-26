import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerAlertSettingsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/alert-settings - Get user alert settings with graceful defaults
  app.fastify.get(
    '/api/alert-settings',
    {
      schema: {
        description: 'Get user alert settings',
        tags: ['alerts', 'settings'],
        response: {
          200: {
            type: 'object',
            properties: {
              alertsEnabled: { type: 'boolean' },
              notifyPriceDrops: { type: 'boolean' },
              notifyUnderTarget: { type: 'boolean' },
              weeklyDigest: { type: 'boolean' },
              quietHoursEnabled: { type: 'boolean' },
              quietStart: { type: ['string', 'null'] },
              quietEnd: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, 'Fetching alert settings');

      try {
        // Query for existing settings
        let settings = await app.db.query.userAlertSettings.findFirst({
          where: eq(schema.userAlertSettings.userId, userId),
        });

        // If no settings exist, create them with defaults via UPSERT
        if (!settings) {
          app.logger.info({ userId }, 'Alert settings not found, creating defaults');

          try {
            const [newSettings] = await app.db
              .insert(schema.userAlertSettings)
              .values({
                userId,
                alertsEnabled: true,
                notifyPriceDrops: true,
                notifyUnderTarget: true,
                weeklyDigest: false,
                quietHoursEnabled: false,
                quietStart: null,
                quietEnd: null,
              })
              .onConflictDoNothing()
              .returning();

            // If insert returned nothing (conflict), query again
            if (!newSettings) {
              settings = await app.db.query.userAlertSettings.findFirst({
                where: eq(schema.userAlertSettings.userId, userId),
              });
            } else {
              settings = newSettings;
            }

            app.logger.info({ userId }, 'Default alert settings created');
          } catch (insertError) {
            app.logger.warn(
              { err: insertError, userId },
              'Failed to create default alert settings, returning hardcoded defaults'
            );

            // Return hardcoded defaults if creation fails
            return {
              alertsEnabled: true,
              notifyPriceDrops: true,
              notifyUnderTarget: true,
              weeklyDigest: false,
              quietHoursEnabled: false,
              quietStart: null,
              quietEnd: null,
            };
          }
        }

        if (!settings) {
          // Safety fallback if query returns nothing
          app.logger.warn({ userId }, 'Alert settings query returned null, using defaults');
          return {
            alertsEnabled: true,
            notifyPriceDrops: true,
            notifyUnderTarget: true,
            weeklyDigest: false,
            quietHoursEnabled: false,
            quietStart: null,
            quietEnd: null,
          };
        }

        app.logger.info(
          {
            userId,
            alertsEnabled: settings.alertsEnabled,
            notifyPriceDrops: settings.notifyPriceDrops,
          },
          'Alert settings retrieved'
        );

        return {
          alertsEnabled: settings.alertsEnabled,
          notifyPriceDrops: settings.notifyPriceDrops,
          notifyUnderTarget: settings.notifyUnderTarget,
          weeklyDigest: settings.weeklyDigest,
          quietHoursEnabled: settings.quietHoursEnabled,
          quietStart: settings.quietStart || null,
          quietEnd: settings.quietEnd || null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to fetch alert settings'
        );

        return reply.status(500).send({
          error: 'Failed to load settings. Please try again.',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // PUT /api/alert-settings - Update alert settings with UPSERT
  app.fastify.put(
    '/api/alert-settings',
    {
      schema: {
        description: 'Update user alert settings',
        tags: ['alerts', 'settings'],
        body: {
          type: 'object',
          properties: {
            alertsEnabled: { type: 'boolean' },
            notifyPriceDrops: { type: 'boolean' },
            notifyUnderTarget: { type: 'boolean' },
            weeklyDigest: { type: 'boolean' },
            quietHoursEnabled: { type: 'boolean' },
            quietStart: { type: ['string', 'null'] },
            quietEnd: { type: ['string', 'null'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              alertsEnabled: { type: 'boolean' },
              notifyPriceDrops: { type: 'boolean' },
              notifyUnderTarget: { type: 'boolean' },
              weeklyDigest: { type: 'boolean' },
              quietHoursEnabled: { type: 'boolean' },
              quietStart: { type: ['string', 'null'] },
              quietEnd: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          alertsEnabled?: boolean;
          notifyPriceDrops?: boolean;
          notifyUnderTarget?: boolean;
          weeklyDigest?: boolean;
          quietHoursEnabled?: boolean;
          quietStart?: string | null;
          quietEnd?: string | null;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const {
        alertsEnabled,
        notifyPriceDrops,
        notifyUnderTarget,
        weeklyDigest,
        quietHoursEnabled,
        quietStart,
        quietEnd,
      } = request.body;

      app.logger.info(
        { userId, alertsEnabled, notifyPriceDrops },
        'Updating alert settings'
      );

      try {
        // Build update object with only provided fields
        const updateValues: any = {};
        if (alertsEnabled !== undefined) updateValues.alertsEnabled = alertsEnabled;
        if (notifyPriceDrops !== undefined) updateValues.notifyPriceDrops = notifyPriceDrops;
        if (notifyUnderTarget !== undefined) updateValues.notifyUnderTarget = notifyUnderTarget;
        if (weeklyDigest !== undefined) updateValues.weeklyDigest = weeklyDigest;
        if (quietHoursEnabled !== undefined) updateValues.quietHoursEnabled = quietHoursEnabled;
        if (quietStart !== undefined) updateValues.quietStart = quietStart;
        if (quietEnd !== undefined) updateValues.quietEnd = quietEnd;

        // Check if settings exist
        let settings = await app.db.query.userAlertSettings.findFirst({
          where: eq(schema.userAlertSettings.userId, userId),
        });

        if (!settings) {
          // Create new settings with update values merged with defaults
          const [newSettings] = await app.db
            .insert(schema.userAlertSettings)
            .values({
              userId,
              alertsEnabled: alertsEnabled ?? true,
              notifyPriceDrops: notifyPriceDrops ?? true,
              notifyUnderTarget: notifyUnderTarget ?? true,
              weeklyDigest: weeklyDigest ?? false,
              quietHoursEnabled: quietHoursEnabled ?? false,
              quietStart: quietStart ?? null,
              quietEnd: quietEnd ?? null,
            })
            .returning();

          settings = newSettings;

          app.logger.info(
            { userId, alertsEnabled: newSettings.alertsEnabled },
            'Alert settings created during update'
          );
        } else {
          // Update existing settings
          const [updated] = await app.db
            .update(schema.userAlertSettings)
            .set({
              ...updateValues,
              updatedAt: new Date(),
            })
            .where(eq(schema.userAlertSettings.userId, userId))
            .returning();

          settings = updated;

          app.logger.info(
            { userId, alertsEnabled: updated.alertsEnabled },
            'Alert settings updated'
          );
        }

        return {
          success: true,
          alertsEnabled: settings.alertsEnabled,
          notifyPriceDrops: settings.notifyPriceDrops,
          notifyUnderTarget: settings.notifyUnderTarget,
          weeklyDigest: settings.weeklyDigest,
          quietHoursEnabled: settings.quietHoursEnabled,
          quietStart: settings.quietStart || null,
          quietEnd: settings.quietEnd || null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to update alert settings'
        );

        return reply.status(500).send({
          error: 'Failed to save settings. Please try again.',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // GET /api/alert-settings/items-with-targets - Count items with target price alerts
  app.fastify.get(
    '/api/alert-settings/items-with-targets',
    {
      schema: {
        description: 'Get count of items with target price alerts',
        tags: ['alerts', 'items'],
        response: {
          200: {
            type: 'object',
            properties: {
              count: { type: 'number' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    currentPrice: { type: ['number', 'null'] },
                    alertPrice: { type: ['number', 'null'] },
                    currency: { type: 'string' },
                    wishlistName: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, 'Fetching items with target price alerts');

      try {
        // Query wishlists for this user
        const wishlists = await app.db.query.wishlists.findMany({
          where: eq(schema.wishlists.userId, userId),
          with: {
            items: {
              where: eq(schema.wishlistItems.alertEnabled, true),
            },
          },
        });

        // Flatten items and filter those with alert prices set
        const itemsWithTargets = wishlists
          .flatMap((wishlist) =>
            wishlist.items
              .filter((item) => item.alertPrice !== null)
              .map((item) => ({
                id: item.id,
                title: item.title,
                currentPrice: item.currentPrice
                  ? parseFloat(item.currentPrice.toString())
                  : null,
                alertPrice: item.alertPrice
                  ? parseFloat(item.alertPrice.toString())
                  : null,
                currency: item.currency,
                wishlistName: wishlist.name,
              }))
          )
          .sort((a, b) => a.title.localeCompare(b.title));

        app.logger.info(
          { userId, count: itemsWithTargets.length },
          'Items with target prices retrieved'
        );

        return {
          count: itemsWithTargets.length,
          items: itemsWithTargets,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to fetch items with target prices'
        );

        return reply.status(500).send({
          error: 'Failed to load items with target prices',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
