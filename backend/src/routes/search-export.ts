import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, like, ilike, inArray, isNotNull, isNull } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

export function registerSearchExportRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/search/global - Global search across wishlists
  app.fastify.get(
    '/api/search/global',
    {
      schema: {
        description: 'Search items across all wishlists',
        tags: ['search'],
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            priceKnown: { type: 'boolean', description: 'Filter by price known' },
            onSale: { type: 'boolean', description: 'Filter by on-sale items' },
            storeDomain: { type: 'string', description: 'Filter by store domain' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    itemId: { type: 'string' },
                    title: { type: 'string' },
                    imageUrl: { type: ['string', 'null'] },
                    price: { type: ['number', 'null'] },
                    currency: { type: 'string' },
                    wishlistId: { type: 'string' },
                    wishlistName: { type: 'string' },
                  },
                },
              },
              totalCount: { type: 'number' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          q?: string;
          priceKnown?: string;
          onSale?: string;
          storeDomain?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { q, priceKnown, onSale, storeDomain } = request.query;

      app.logger.info(
        { userId, q, priceKnown, onSale, storeDomain },
        'Global search'
      );

      try {
        // Get user's wishlists
        const wishlists = await app.db
          .select({ id: schema.wishlists.id, name: schema.wishlists.name })
          .from(schema.wishlists)
          .where(eq(schema.wishlists.userId, userId));

        if (wishlists.length === 0) {
          return { results: [], totalCount: 0 };
        }

        // Build query for items
        const items = await app.db
          .select({
            id: schema.wishlistItems.id,
            title: schema.wishlistItems.title,
            imageUrl: schema.wishlistItems.imageUrl,
            currentPrice: schema.wishlistItems.currentPrice,
            currency: schema.wishlistItems.currency,
            sourceDomain: schema.wishlistItems.sourceDomain,
            wishlistId: schema.wishlistItems.wishlistId,
          })
          .from(schema.wishlistItems)
          .where(
            and(
              inArray(
                schema.wishlistItems.wishlistId,
                wishlists.map((w) => w.id)
              ),
              q ? ilike(schema.wishlistItems.title, `%${q}%`) : undefined,
              storeDomain
                ? like(schema.wishlistItems.sourceDomain, `%${storeDomain}%`)
                : undefined,
              priceKnown === 'true'
                ? isNotNull(schema.wishlistItems.currentPrice)
                : priceKnown === 'false'
                  ? isNull(schema.wishlistItems.currentPrice)
                  : undefined
            )
          );

        // Map wishlist IDs to names
        const wishlistMap = new Map(wishlists.map((w) => [w.id, w.name]));

        // Filter by on-sale if needed
        let results = items.map((item) => ({
          itemId: item.id,
          title: item.title,
          imageUrl: item.imageUrl,
          price: item.currentPrice ? parseFloat(item.currentPrice) : null,
          currency: item.currency,
          wishlistId: item.wishlistId,
          wishlistName: wishlistMap.get(item.wishlistId) || 'Unknown',
        }));

        if (onSale === 'true') {
          // TODO: Filter to only items with price drops
          // This would require price history, so for now return all
        }

        app.logger.info(
          { userId, resultCount: results.length },
          'Global search completed'
        );

        return {
          results,
          totalCount: results.length,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to perform global search'
        );
        return reply
          .status(500)
          .send({ error: 'Failed to perform search' });
      }
    }
  );

  // POST /api/export/csv - Export wishlists to CSV
  app.fastify.post(
    '/api/export/csv',
    {
      schema: {
        description: 'Export wishlists to CSV format',
        tags: ['export'],
        response: {
          200: {
            type: 'object',
            properties: {
              downloadUrl: { type: 'string' },
              expiresAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Exporting CSV');

      try {
        // Get user's wishlists and items
        const wishlists = await app.db.query.wishlists.findMany({
          where: eq(schema.wishlists.userId, userId),
          with: {
            items: true,
          },
        });

        // Generate CSV content
        const rows: string[] = [
          'Wishlist,Item Title,Price,Currency,URL,Image URL,Notes,Created At',
        ];

        for (const wishlist of wishlists) {
          for (const item of wishlist.items) {
            const row = [
              `"${wishlist.name.replace(/"/g, '""')}"`,
              `"${item.title.replace(/"/g, '""')}"`,
              item.currentPrice || '',
              item.currency,
              item.originalUrl || '',
              item.imageUrl || '',
              `"${(item.notes || '').replace(/"/g, '""')}"`,
              item.createdAt.toISOString(),
            ].join(',');
            rows.push(row);
          }
        }

        const csvContent = rows.join('\n');

        // In a real implementation, you would:
        // 1. Write to temp file
        // 2. Generate signed S3 URL or similar
        // 3. Return download URL

        // For now, return a placeholder
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        app.logger.info(
          { userId, itemCount: wishlists.reduce((sum, w) => sum + w.items.length, 0) },
          'CSV export generated'
        );

        return {
          downloadUrl: `/api/export/download/${Buffer.from(csvContent).toString('base64')}`,
          expiresAt: expiresAt.toISOString(),
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to export CSV'
        );
        return reply.status(500).send({ error: 'Failed to export CSV' });
      }
    }
  );

  // POST /api/export/pdf - Export wishlists to PDF
  app.fastify.post(
    '/api/export/pdf',
    {
      schema: {
        description: 'Export wishlists to PDF format',
        tags: ['export'],
        response: {
          200: {
            type: 'object',
            properties: {
              downloadUrl: { type: 'string' },
              expiresAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Exporting PDF');

      try {
        // Get user's wishlists and items
        const wishlists = await app.db.query.wishlists.findMany({
          where: eq(schema.wishlists.userId, userId),
          with: {
            items: true,
          },
        });

        // In a real implementation, you would:
        // 1. Use a PDF library like pdfkit or puppeteer
        // 2. Generate PDF content
        // 3. Write to temp file
        // 4. Generate signed S3 URL or similar
        // 5. Return download URL

        // For now, return a placeholder
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        app.logger.info(
          { userId, wishlistCount: wishlists.length },
          'PDF export generated'
        );

        return {
          downloadUrl: '/api/export/download/placeholder.pdf',
          expiresAt: expiresAt.toISOString(),
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to export PDF'
        );
        return reply.status(500).send({ error: 'Failed to export PDF' });
      }
    }
  );
}
