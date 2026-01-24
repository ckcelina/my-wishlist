import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

// Calculate string similarity using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// Normalize title for comparison
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

export function registerEngagementRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/items/check-duplicates - Check for duplicate items before saving
  app.fastify.post(
    '/api/items/check-duplicates',
    {
      schema: {
        description: 'Check for duplicate items in the same wishlist before saving',
        tags: ['items', 'engagement'],
        body: {
          type: 'object',
          properties: {
            wishlistId: { type: 'string' },
            title: { type: 'string' },
            originalUrl: { type: 'string' },
            imageUrl: { type: 'string' },
          },
          required: ['wishlistId', 'title'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              duplicates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    imageUrl: { type: ['string', 'null'] },
                    currentPrice: { type: ['string', 'null'] },
                    currency: { type: 'string' },
                    originalUrl: { type: ['string', 'null'] },
                    similarity: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          wishlistId: string;
          title: string;
          originalUrl?: string;
          imageUrl?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { wishlistId, title, originalUrl, imageUrl } = request.body;

      app.logger.info(
        { wishlistId, title, userId },
        'Checking for duplicate items'
      );

      try {
        // Verify wishlist ownership
        const wishlist = await app.db.query.wishlists.findFirst({
          where: eq(schema.wishlists.id, wishlistId),
        });

        if (!wishlist || wishlist.userId !== userId) {
          return reply.status(404).send({ error: 'Wishlist not found' });
        }

        // Get all items in the wishlist
        const items = await app.db
          .select()
          .from(schema.wishlistItems)
          .where(eq(schema.wishlistItems.wishlistId, wishlistId));

        const duplicates: any[] = [];

        for (const item of items) {
          // Check exact URL match
          if (originalUrl && item.originalUrl && originalUrl === item.originalUrl) {
            duplicates.push({
              id: item.id,
              title: item.title,
              imageUrl: item.imageUrl,
              currentPrice: item.currentPrice,
              currency: item.currency,
              originalUrl: item.originalUrl,
              similarity: 1, // Exact URL match
              matchType: 'exact_url',
            });
            continue;
          }

          // Check title and image similarity
          const titleSimilarity = calculateSimilarity(title, item.title);
          const hasImageMatch = imageUrl && item.imageUrl && imageUrl === item.imageUrl;

          // Consider it a duplicate if title similarity is high (>0.7) and images match or both have images
          if (titleSimilarity > 0.7 && (hasImageMatch || (imageUrl && item.imageUrl))) {
            duplicates.push({
              id: item.id,
              title: item.title,
              imageUrl: item.imageUrl,
              currentPrice: item.currentPrice,
              currency: item.currency,
              originalUrl: item.originalUrl,
              similarity: titleSimilarity,
              matchType: hasImageMatch ? 'exact_image' : 'similar_title_with_image',
            });
          }
        }

        // Sort by similarity (descending)
        duplicates.sort((a, b) => b.similarity - a.similarity);

        // Remove matchType from response (internal use only)
        const response = duplicates.map((dup) => {
          const { matchType, ...rest } = dup;
          return rest;
        });

        app.logger.info(
          { wishlistId, duplicateCount: response.length },
          'Duplicate check completed'
        );

        return { duplicates: response };
      } catch (error) {
        app.logger.error(
          { err: error, wishlistId, title },
          'Failed to check for duplicates'
        );
        return reply.status(500).send({
          error: 'Failed to check for duplicates',
        });
      }
    }
  );

  // GET /api/items/on-sale - Get items with price drops across all user wishlists
  app.fastify.get(
    '/api/items/on-sale',
    {
      schema: {
        description: 'Get items with price drops across all user wishlists',
        tags: ['items', 'engagement'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 20 },
            offset: { type: 'number', default: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    imageUrl: { type: ['string', 'null'] },
                    wishlistId: { type: 'string' },
                    wishlistName: { type: 'string' },
                    currentPrice: { type: ['number', 'null'] },
                    previousPrice: { type: ['number', 'null'] },
                    currency: { type: 'string' },
                    percentageChange: { type: ['number', 'null'] },
                    lowestPrice: { type: ['number', 'null'] },
                    isLowestPrice: { type: 'boolean' },
                  },
                },
              },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          limit?: number;
          offset?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const limit = Math.min(request.query.limit || 20, 100);
      const offset = request.query.offset || 0;

      app.logger.info(
        { userId, limit, offset },
        'Fetching on-sale items'
      );

      try {
        // Get all wishlists for user
        const wishlists = await app.db
          .select({ id: schema.wishlists.id, name: schema.wishlists.name })
          .from(schema.wishlists)
          .where(eq(schema.wishlists.userId, userId));

        if (wishlists.length === 0) {
          return { items: [], total: 0 };
        }

        const wishlistIds = wishlists.map((w) => w.id);

        // Get items with price history for each wishlist
        const itemsWithPriceHistory = await app.db
          .select({
            itemId: schema.wishlistItems.id,
            title: schema.wishlistItems.title,
            imageUrl: schema.wishlistItems.imageUrl,
            wishlistId: schema.wishlistItems.wishlistId,
            currentPrice: schema.wishlistItems.currentPrice,
            currency: schema.wishlistItems.currency,
            priceId: schema.priceHistory.id,
            historyPrice: schema.priceHistory.price,
            recordedAt: schema.priceHistory.recordedAt,
          })
          .from(schema.wishlistItems)
          .leftJoin(
            schema.priceHistory,
            eq(schema.wishlistItems.id, schema.priceHistory.itemId)
          )
          .where(
            and(
              sql`${schema.wishlistItems.wishlistId} = ANY(${wishlistIds}::uuid[])`
            )
          );

        // Group by item and calculate price changes
        const itemMap = new Map<
          string,
          {
            id: string;
            title: string;
            imageUrl: string | null;
            wishlistId: string;
            currentPrice: string | null;
            currency: string;
            prices: { price: number; recordedAt: Date }[];
          }
        >();

        for (const row of itemsWithPriceHistory) {
          if (!itemMap.has(row.itemId)) {
            itemMap.set(row.itemId, {
              id: row.itemId,
              title: row.title,
              imageUrl: row.imageUrl,
              wishlistId: row.wishlistId,
              currentPrice: row.currentPrice,
              currency: row.currency,
              prices: [],
            });
          }

          if (row.historyPrice && row.recordedAt) {
            itemMap.get(row.itemId)!.prices.push({
              price: parseFloat(row.historyPrice),
              recordedAt: row.recordedAt,
            });
          }
        }

        // Calculate price drops and filter items
        const saleItems: any[] = [];

        for (const [itemId, itemData] of itemMap.entries()) {
          if (itemData.prices.length < 2 || !itemData.currentPrice) continue;

          // Sort by date
          itemData.prices.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

          const currentPriceNum = parseFloat(itemData.currentPrice);
          const lowestPrice = Math.min(...itemData.prices.map((p) => p.price));
          const previousPrice = itemData.prices[itemData.prices.length - 2]?.price || itemData.prices[0].price;
          const isLowestPrice = currentPriceNum === lowestPrice;

          // Include items that either dropped in price or are at lowest recorded price
          if (previousPrice > currentPriceNum || isLowestPrice) {
            const percentageChange = previousPrice > 0 ? ((currentPriceNum - previousPrice) / previousPrice) * 100 : null;

            const wishlistName =
              wishlists.find((w) => w.id === itemData.wishlistId)?.name || 'Unknown Wishlist';

            saleItems.push({
              id: itemData.id,
              title: itemData.title,
              imageUrl: itemData.imageUrl,
              wishlistId: itemData.wishlistId,
              wishlistName,
              currentPrice: currentPriceNum,
              previousPrice: previousPrice !== currentPriceNum ? previousPrice : null,
              currency: itemData.currency,
              percentageChange: percentageChange ? Math.round(percentageChange * 100) / 100 : null,
              lowestPrice,
              isLowestPrice,
            });
          }
        }

        // Sort by price drop percentage (descending)
        saleItems.sort((a, b) => {
          const aDrop = a.percentageChange || -999;
          const bDrop = b.percentageChange || -999;
          return aDrop - bDrop;
        });

        const total = saleItems.length;
        const paginatedItems = saleItems.slice(offset, offset + limit);

        app.logger.info(
          { userId, total, returned: paginatedItems.length },
          'On-sale items fetched'
        );

        return { items: paginatedItems, total };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to fetch on-sale items'
        );
        return reply.status(500).send({
          error: 'Failed to fetch on-sale items',
        });
      }
    }
  );

  // GET /api/notifications/weekly-digest - Get weekly price drop summary
  app.fastify.get(
    '/api/notifications/weekly-digest',
    {
      schema: {
        description: 'Get weekly price drop summary for user',
        tags: ['notifications', 'engagement'],
        response: {
          200: {
            type: 'object',
            properties: {
              totalDrops: { type: 'number' },
              topDrops: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    imageUrl: { type: ['string', 'null'] },
                    wishlistName: { type: 'string' },
                    oldPrice: { type: 'number' },
                    newPrice: { type: 'number' },
                    priceDropped: { type: 'number' },
                    percentageChange: { type: 'number' },
                    currency: { type: 'string' },
                  },
                },
              },
              period: {
                type: 'object',
                properties: {
                  startDate: { type: 'string' },
                  endDate: { type: 'string' },
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

      app.logger.info({ userId }, 'Fetching weekly digest');

      try {
        // Calculate date range for past 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        // Get all wishlists for user
        const wishlists = await app.db
          .select({ id: schema.wishlists.id, name: schema.wishlists.name })
          .from(schema.wishlists)
          .where(eq(schema.wishlists.userId, userId));

        if (wishlists.length === 0) {
          return { totalDrops: 0, topDrops: [], period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() } };
        }

        const wishlistIds = wishlists.map((w) => w.id);

        // Get items with price history for each wishlist
        const itemsWithPriceHistory = await app.db
          .select({
            itemId: schema.wishlistItems.id,
            title: schema.wishlistItems.title,
            imageUrl: schema.wishlistItems.imageUrl,
            wishlistId: schema.wishlistItems.wishlistId,
            currentPrice: schema.wishlistItems.currentPrice,
            currency: schema.wishlistItems.currency,
            historyPrice: schema.priceHistory.price,
            recordedAt: schema.priceHistory.recordedAt,
          })
          .from(schema.wishlistItems)
          .leftJoin(
            schema.priceHistory,
            eq(schema.wishlistItems.id, schema.priceHistory.itemId)
          )
          .where(
            and(
              sql`${schema.wishlistItems.wishlistId} = ANY(${wishlistIds}::uuid[])`
            )
          );

        // Group by item and calculate price changes
        const itemMap = new Map<
          string,
          {
            id: string;
            title: string;
            imageUrl: string | null;
            wishlistId: string;
            currentPrice: string | null;
            currency: string;
            prices: { price: number; recordedAt: Date }[];
          }
        >();

        for (const row of itemsWithPriceHistory) {
          if (!itemMap.has(row.itemId)) {
            itemMap.set(row.itemId, {
              id: row.itemId,
              title: row.title,
              imageUrl: row.imageUrl,
              wishlistId: row.wishlistId,
              currentPrice: row.currentPrice,
              currency: row.currency,
              prices: [],
            });
          }

          if (row.historyPrice && row.recordedAt) {
            itemMap.get(row.itemId)!.prices.push({
              price: parseFloat(row.historyPrice),
              recordedAt: row.recordedAt,
            });
          }
        }

        // Calculate drops in the past week
        const droppedItems: any[] = [];

        for (const [itemId, itemData] of itemMap.entries()) {
          if (!itemData.currentPrice) continue;

          // Filter prices within the week
          const weekPrices = itemData.prices.filter(
            (p) => p.recordedAt >= startDate && p.recordedAt <= endDate
          );

          if (weekPrices.length < 2) continue;

          weekPrices.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

          const oldPrice = weekPrices[0].price;
          const newPrice = parseFloat(itemData.currentPrice);
          const priceDropped = oldPrice - newPrice;

          // Only include items that actually dropped
          if (priceDropped > 0) {
            const percentageChange = (priceDropped / oldPrice) * 100;
            const wishlistName =
              wishlists.find((w) => w.id === itemData.wishlistId)?.name || 'Unknown Wishlist';

            droppedItems.push({
              id: itemData.id,
              title: itemData.title,
              imageUrl: itemData.imageUrl,
              wishlistName,
              oldPrice,
              newPrice,
              priceDropped: Math.round(priceDropped * 100) / 100,
              percentageChange: Math.round(percentageChange * 100) / 100,
              currency: itemData.currency,
            });
          }
        }

        // Sort by price dropped amount (descending) and get top 3
        droppedItems.sort((a, b) => b.priceDropped - a.priceDropped);
        const topDrops = droppedItems.slice(0, 3);

        app.logger.info(
          { userId, totalDrops: droppedItems.length, topCount: topDrops.length },
          'Weekly digest fetched'
        );

        return {
          totalDrops: droppedItems.length,
          topDrops,
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to fetch weekly digest'
        );
        return reply.status(500).send({
          error: 'Failed to fetch weekly digest',
        });
      }
    }
  );
}
