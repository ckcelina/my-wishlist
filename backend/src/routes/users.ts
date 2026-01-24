import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';
import { isValidLanguageCode, getLanguages } from '../utils/languages.js';

export function registerUserRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/users/init-defaults - Initialize a default wishlist for new users
  app.fastify.post(
    '/api/users/init-defaults',
    {
      schema: {
        description: 'Initialize a wishlist for new user',
        tags: ['users'],
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Initializing defaults for user');

      try {
        // Check if any wishlist already exists
        const existing = await app.db.query.wishlists.findFirst({
          where: eq(schema.wishlists.userId, userId),
        });

        if (existing) {
          app.logger.info({ userId }, 'Wishlist already exists');
          return { success: true };
        }

        // Create initial wishlist
        const [wishlist] = await app.db
          .insert(schema.wishlists)
          .values({
            userId,
            name: 'My Wishlist',
          })
          .returning();

        app.logger.info(
          { userId, wishlistId: wishlist.id },
          'Wishlist created'
        );
        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to create wishlist'
        );
        throw error;
      }
    }
  );

  // GET /api/users/me - Get current user profile
  app.fastify.get(
    '/api/users/me',
    {
      schema: {
        description: 'Get current user profile',
        tags: ['users'],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching user profile');

      return {
        id: session.user.id,
        name: session.user.name || '',
        email: session.user.email || '',
      };
    }
  );

  // GET /api/users/language-preferences - Get user's language preferences
  app.fastify.get(
    '/api/users/language-preferences',
    {
      schema: {
        description: 'Get user language preferences',
        tags: ['users', 'preferences'],
        response: {
          200: {
            type: 'object',
            properties: {
              languageMode: {
                type: 'string',
                enum: ['system', 'manual'],
              },
              languageCode: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, 'Fetching language preferences');

      try {
        // Try to find existing settings
        let settings = await app.db.query.userSettings.findFirst({
          where: eq(schema.userSettings.userId, userId),
        });

        // If no settings exist, create default ones
        if (!settings) {
          const [newSettings] = await app.db
            .insert(schema.userSettings)
            .values({
              userId,
              languageMode: 'system',
              languageCode: 'en',
            })
            .returning();

          settings = newSettings;

          app.logger.info(
            { userId, languageMode: 'system', languageCode: 'en' },
            'Default language settings created'
          );
        }

        app.logger.info(
          {
            userId,
            languageMode: settings.languageMode,
            languageCode: settings.languageCode,
          },
          'Language preferences retrieved'
        );

        return {
          languageMode: settings.languageMode,
          languageCode: settings.languageCode,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to fetch language preferences'
        );
        return reply
          .status(500)
          .send({ error: 'Failed to fetch language preferences' });
      }
    }
  );

  // PUT /api/users/language-preferences - Update user's language preferences
  app.fastify.put(
    '/api/users/language-preferences',
    {
      schema: {
        description: 'Update user language preferences',
        tags: ['users', 'preferences'],
        body: {
          type: 'object',
          properties: {
            languageMode: {
              type: 'string',
              enum: ['system', 'manual'],
            },
            languageCode: { type: 'string' },
          },
          required: ['languageMode', 'languageCode'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              languageMode: {
                type: 'string',
                enum: ['system', 'manual'],
              },
              languageCode: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          languageMode: 'system' | 'manual';
          languageCode: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { languageMode, languageCode } = request.body;

      app.logger.info(
        { userId, languageMode, languageCode },
        'Updating language preferences'
      );

      try {
        // Validate language code
        if (!isValidLanguageCode(languageCode)) {
          app.logger.warn(
            { userId, languageCode },
            'Invalid language code provided'
          );
          return reply.status(400).send({
            error: `Invalid language code: ${languageCode}`,
            supportedLanguages: getLanguages().map((lang) => ({
              code: lang.code,
              name: lang.name,
            })),
          });
        }

        // Check if settings exist
        let settings = await app.db.query.userSettings.findFirst({
          where: eq(schema.userSettings.userId, userId),
        });

        if (!settings) {
          // Create new settings if they don't exist
          const [newSettings] = await app.db
            .insert(schema.userSettings)
            .values({
              userId,
              languageMode,
              languageCode,
            })
            .returning();

          settings = newSettings;

          app.logger.info(
            { userId, languageMode, languageCode },
            'Language settings created'
          );
        } else {
          // Update existing settings
          const [updated] = await app.db
            .update(schema.userSettings)
            .set({
              languageMode,
              languageCode,
            })
            .where(eq(schema.userSettings.userId, userId))
            .returning();

          settings = updated;

          app.logger.info(
            { userId, languageMode, languageCode },
            'Language settings updated'
          );
        }

        return {
          success: true,
          languageMode: settings.languageMode,
          languageCode: settings.languageCode,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, languageMode, languageCode },
          'Failed to update language preferences'
        );
        return reply.status(500).send({
          error: 'Failed to update language preferences',
        });
      }
    }
  );

  // GET /api/languages - Get list of supported languages
  app.fastify.get(
    '/api/languages',
    {
      schema: {
        description: 'Get list of supported languages',
        tags: ['languages'],
        response: {
          200: {
            type: 'object',
            properties: {
              languages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    name: { type: 'string' },
                    nativeName: { type: 'string' },
                    rtl: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      app.logger.info('Fetching supported languages list');

      const languages = getLanguages();

      app.logger.info({ languageCount: languages.length }, 'Languages list sent');

      return {
        languages,
      };
    }
  );

}
