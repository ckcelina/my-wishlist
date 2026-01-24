import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerImportTemplateRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/import-templates - Get user's import templates
  app.fastify.get(
    '/api/import-templates',
    {
      schema: {
        description: 'Get all import templates for user',
        tags: ['import'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                mode: { type: 'string' },
                groupingMode: { type: 'string' },
                defaultWishlistId: { type: ['string', 'null'] },
                createdAt: { type: 'string' },
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
      app.logger.info({ userId }, 'Fetching import templates');

      try {
        const templates = await app.db
          .select({
            id: schema.importTemplates.id,
            name: schema.importTemplates.name,
            mode: schema.importTemplates.mode,
            groupingMode: schema.importTemplates.groupingMode,
            defaultWishlistId: schema.importTemplates.defaultWishlistId,
            createdAt: schema.importTemplates.createdAt,
          })
          .from(schema.importTemplates)
          .where(eq(schema.importTemplates.userId, userId));

        app.logger.info(
          { userId, count: templates.length },
          'Import templates fetched'
        );

        return templates.map((t) => ({
          ...t,
          defaultWishlistId: t.defaultWishlistId || null,
          createdAt: t.createdAt.toISOString(),
        }));
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to fetch templates'
        );
        return reply.status(500).send({ error: 'Failed to fetch templates' });
      }
    }
  );

  // POST /api/import-templates - Create import template
  app.fastify.post(
    '/api/import-templates',
    {
      schema: {
        description: 'Create a new import template',
        tags: ['import'],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            mode: { type: 'string' },
            groupingMode: { type: 'string' },
            defaultWishlistId: { type: 'string' },
          },
          required: ['name', 'mode', 'groupingMode'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              mode: { type: 'string' },
              groupingMode: { type: 'string' },
              defaultWishlistId: { type: ['string', 'null'] },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          mode: string;
          groupingMode: string;
          defaultWishlistId?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { name, mode, groupingMode, defaultWishlistId } = request.body;

      app.logger.info(
        { userId, name, mode, groupingMode },
        'Creating import template'
      );

      try {
        // Verify default wishlist ownership if provided
        if (defaultWishlistId) {
          const wishlist = await app.db.query.wishlists.findFirst({
            where: eq(schema.wishlists.id, defaultWishlistId),
          });

          if (!wishlist || wishlist.userId !== userId) {
            return reply.status(404).send({ error: 'Default wishlist not found' });
          }
        }

        const [template] = await app.db
          .insert(schema.importTemplates)
          .values({
            userId,
            name,
            mode,
            groupingMode,
            defaultWishlistId: defaultWishlistId || null,
          })
          .returning();

        app.logger.info(
          { templateId: template.id, name },
          'Import template created'
        );

        reply.status(201);
        return {
          id: template.id,
          name: template.name,
          mode: template.mode,
          groupingMode: template.groupingMode,
          defaultWishlistId: template.defaultWishlistId || null,
          createdAt: template.createdAt.toISOString(),
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, name },
          'Failed to create template'
        );
        return reply.status(500).send({ error: 'Failed to create template' });
      }
    }
  );

  // GET /api/import-templates/:id - Get template details
  app.fastify.get(
    '/api/import-templates/:id',
    {
      schema: {
        description: 'Get import template details',
        tags: ['import'],
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
              id: { type: 'string' },
              name: { type: 'string' },
              mode: { type: 'string' },
              groupingMode: { type: 'string' },
              defaultWishlistId: { type: ['string', 'null'] },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          id: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;

      app.logger.info({ templateId: id, userId }, 'Fetching template');

      try {
        const template = await app.db.query.importTemplates.findFirst({
          where: eq(schema.importTemplates.id, id),
        });

        if (!template || template.userId !== userId) {
          return reply.status(404).send({ error: 'Template not found' });
        }

        return {
          id: template.id,
          name: template.name,
          mode: template.mode,
          groupingMode: template.groupingMode,
          defaultWishlistId: template.defaultWishlistId || null,
          createdAt: template.createdAt.toISOString(),
        };
      } catch (error) {
        app.logger.error(
          { err: error, templateId: id, userId },
          'Failed to fetch template'
        );
        return reply.status(500).send({ error: 'Failed to fetch template' });
      }
    }
  );

  // DELETE /api/import-templates/:id - Delete template
  app.fastify.delete(
    '/api/import-templates/:id',
    {
      schema: {
        description: 'Delete an import template',
        tags: ['import'],
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
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          id: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;

      app.logger.info({ templateId: id, userId }, 'Deleting template');

      try {
        const template = await app.db.query.importTemplates.findFirst({
          where: eq(schema.importTemplates.id, id),
        });

        if (!template || template.userId !== userId) {
          return reply.status(404).send({ error: 'Template not found' });
        }

        await app.db
          .delete(schema.importTemplates)
          .where(eq(schema.importTemplates.id, id));

        app.logger.info({ templateId: id }, 'Template deleted');

        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, templateId: id, userId },
          'Failed to delete template'
        );
        return reply.status(500).send({ error: 'Failed to delete template' });
      }
    }
  );
}
