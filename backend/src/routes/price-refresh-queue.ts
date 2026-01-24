import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, inArray } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

// Rate limiting: Track last refresh time per item to avoid spamming
const itemRefreshTimes = new Map<string, number>();
const RATE_LIMIT_MS = 2000; // 2 seconds between item refreshes

export function registerPriceRefreshQueueRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/price-refresh/create - Create a new price refresh job
  app.fastify.post(
    '/api/price-refresh/create',
    {
      schema: {
        description: 'Create a new price refresh job',
        tags: ['price-refresh'],
        body: {
          type: 'object',
          properties: {
            wishlistId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              status: { type: 'string' },
              totalItems: { type: 'number' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          wishlistId?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { wishlistId } = request.body;

      app.logger.info(
        { userId, wishlistId },
        'price_refresh_job_created'
      );

      try {
        // Get items to refresh
        let items;
        if (wishlistId) {
          // Verify wishlist ownership
          const wishlist = await app.db.query.wishlists.findFirst({
            where: eq(schema.wishlists.id, wishlistId),
          });

          if (!wishlist || wishlist.userId !== userId) {
            return reply.status(404).send({ error: 'Wishlist not found' });
          }

          items = await app.db
            .select({ id: schema.wishlistItems.id })
            .from(schema.wishlistItems)
            .where(eq(schema.wishlistItems.wishlistId, wishlistId));
        } else {
          // Get all items from all user wishlists
          const wishlists = await app.db
            .select({ id: schema.wishlists.id })
            .from(schema.wishlists)
            .where(eq(schema.wishlists.userId, userId));

          const wishlistIds = wishlists.map((w) => w.id);

          items = await app.db
            .select({ id: schema.wishlistItems.id })
            .from(schema.wishlistItems)
            .where(
              wishlistIds.length > 0
                ? inArray(schema.wishlistItems.wishlistId, wishlistIds)
                : undefined
            );
        }

        const totalItems = items.length;

        // Create the job
        const [job] = await app.db
          .insert(schema.priceRefreshJobs)
          .values({
            userId,
            wishlistId: wishlistId || null,
            status: 'queued',
            totalItems,
            processedItems: 0,
          })
          .returning();

        app.logger.info(
          { jobId: job.id, userId, totalItems },
          'Price refresh job created'
        );

        return {
          jobId: job.id,
          status: job.status,
          totalItems,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, wishlistId },
          'Failed to create price refresh job'
        );
        return reply.status(500).send({
          error: 'Failed to create price refresh job',
        });
      }
    }
  );

  // GET /api/price-refresh/status/:jobId - Get job status
  app.fastify.get(
    '/api/price-refresh/status/:jobId',
    {
      schema: {
        description: 'Get price refresh job status',
        tags: ['price-refresh'],
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
          required: ['jobId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              totalItems: { type: 'number' },
              processedItems: { type: 'number' },
              createdAt: { type: 'string' },
              startedAt: { type: ['string', 'null'] },
              finishedAt: { type: ['string', 'null'] },
              errorMessage: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          jobId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { jobId } = request.params;

      app.logger.info({ jobId, userId }, 'Fetching job status');

      try {
        const job = await app.db.query.priceRefreshJobs.findFirst({
          where: eq(schema.priceRefreshJobs.id, jobId),
        });

        if (!job || job.userId !== userId) {
          return reply.status(404).send({ error: 'Job not found' });
        }

        return {
          id: job.id,
          status: job.status,
          totalItems: job.totalItems,
          processedItems: job.processedItems,
          createdAt: job.createdAt.toISOString(),
          startedAt: job.startedAt?.toISOString() || null,
          finishedAt: job.finishedAt?.toISOString() || null,
          errorMessage: job.errorMessage || null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, jobId, userId },
          'Failed to fetch job status'
        );
        return reply.status(500).send({
          error: 'Failed to fetch job status',
        });
      }
    }
  );

  // POST /api/price-refresh/process/:jobId - Process up to 10 items
  app.fastify.post(
    '/api/price-refresh/process/:jobId',
    {
      schema: {
        description: 'Process up to 10 items for a price refresh job',
        tags: ['price-refresh'],
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
          required: ['jobId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              processedItems: { type: 'number' },
              failedItems: { type: 'number' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          jobId: string;
        };
        Body: Record<string, never>;
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { jobId } = request.params;

      app.logger.info({ jobId, userId }, 'Processing price refresh job');

      try {
        const job = await app.db.query.priceRefreshJobs.findFirst({
          where: eq(schema.priceRefreshJobs.id, jobId),
        });

        if (!job || job.userId !== userId) {
          return reply.status(404).send({ error: 'Job not found' });
        }

        if (job.status === 'done') {
          return {
            success: true,
            processedItems: 0,
            failedItems: 0,
          };
        }

        // Update job status to running if not already
        if (job.status === 'queued') {
          await app.db
            .update(schema.priceRefreshJobs)
            .set({ status: 'running', startedAt: new Date() })
            .where(eq(schema.priceRefreshJobs.id, jobId));
        }

        // Get items that haven't been processed yet
        const wishlistIds = job.wishlistId
          ? [job.wishlistId]
          : (
              await app.db
                .select({ id: schema.wishlists.id })
                .from(schema.wishlists)
                .where(eq(schema.wishlists.userId, userId))
            ).map((w) => w.id);

        const itemsToProcess = await app.db
          .select()
          .from(schema.wishlistItems)
          .where(
            wishlistIds.length > 0
              ? inArray(schema.wishlistItems.wishlistId, wishlistIds)
              : undefined
          )
          .limit(10);

        let processedCount = 0;
        let failedCount = 0;

        for (const item of itemsToProcess) {
          try {
            // Rate limiting: wait if needed
            const lastRefreshTime = itemRefreshTimes.get(item.id);
            if (lastRefreshTime && Date.now() - lastRefreshTime < RATE_LIMIT_MS) {
              const waitTime = RATE_LIMIT_MS - (Date.now() - lastRefreshTime);
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            }

            const oldPrice = item.currentPrice
              ? parseFloat(item.currentPrice.toString())
              : null;
            let newPrice = oldPrice;

            // Extract price from URL if available
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
                          text: `Extract the current price from this product URL. Return ONLY: {"price": 99.99} or {"price": null}\n\nURL: ${item.originalUrl}`,
                        },
                      ],
                    },
                  ],
                });

                const extracted = JSON.parse(result.text);
                if (extracted.price) {
                  newPrice = extracted.price;
                }
              } catch (error) {
                app.logger.debug(
                  { err: error, itemId: item.id },
                  'Failed to extract price'
                );
              }
            }

            // Update item price
            await app.db
              .update(schema.wishlistItems)
              .set({
                currentPrice: newPrice ? newPrice.toString() : null,
                lastCheckedAt: new Date(),
              })
              .where(eq(schema.wishlistItems.id, item.id));

            // Add to price history
            if (newPrice) {
              await app.db.insert(schema.priceHistory).values({
                itemId: item.id,
                price: newPrice.toString(),
                currency: item.currency,
              });
            }

            itemRefreshTimes.set(item.id, Date.now());
            processedCount++;
          } catch (error) {
            app.logger.error(
              { err: error, itemId: item.id },
              'Failed to process item'
            );
            failedCount++;
          }
        }

        // Update job progress
        const newProcessedCount = job.processedItems + processedCount;
        const isComplete = newProcessedCount >= job.totalItems;

        await app.db
          .update(schema.priceRefreshJobs)
          .set({
            processedItems: newProcessedCount,
            status: isComplete ? 'done' : 'running',
            finishedAt: isComplete ? new Date() : null,
          })
          .where(eq(schema.priceRefreshJobs.id, jobId));

        if (isComplete) {
          app.logger.info(
            { jobId, processedTotal: newProcessedCount },
            'price_refresh_job_completed'
          );
        }

        return {
          success: true,
          processedItems: processedCount,
          failedItems: failedCount,
        };
      } catch (error) {
        app.logger.error(
          { err: error, jobId, userId },
          'Failed to process job'
        );

        // Mark job as failed
        await app.db
          .update(schema.priceRefreshJobs)
          .set({
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            finishedAt: new Date(),
          })
          .where(eq(schema.priceRefreshJobs.id, jobId));

        app.logger.info(
          { jobId },
          'price_refresh_job_failed'
        );

        return reply.status(500).send({
          error: 'Failed to process job',
        });
      }
    }
  );

  // POST /api/price-refresh/retry/:jobId - Retry a failed job
  app.fastify.post(
    '/api/price-refresh/retry/:jobId',
    {
      schema: {
        description: 'Retry a failed price refresh job',
        tags: ['price-refresh'],
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
          required: ['jobId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              jobId: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: {
          jobId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { jobId } = request.params;

      app.logger.info({ jobId, userId }, 'Retrying price refresh job');

      try {
        const job = await app.db.query.priceRefreshJobs.findFirst({
          where: eq(schema.priceRefreshJobs.id, jobId),
        });

        if (!job || job.userId !== userId) {
          return reply.status(404).send({ error: 'Job not found' });
        }

        // Reset job to queued status
        await app.db
          .update(schema.priceRefreshJobs)
          .set({
            status: 'queued',
            processedItems: 0,
            errorMessage: null,
            startedAt: null,
            finishedAt: null,
          })
          .where(eq(schema.priceRefreshJobs.id, jobId));

        app.logger.info({ jobId }, 'Price refresh job retry queued');

        return {
          success: true,
          jobId,
          status: 'queued',
        };
      } catch (error) {
        app.logger.error(
          { err: error, jobId, userId },
          'Failed to retry job'
        );
        return reply.status(500).send({
          error: 'Failed to retry job',
        });
      }
    }
  );
}
