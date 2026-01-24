import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

interface ImportItem {
  tempId: string;
  title: string;
  imageUrl?: string;
  productUrl?: string;
  sourceDomain?: string;
}

interface DuplicateGroup {
  groupId: string;
  members: string[]; // tempIds
  confidence: number;
  canonicalTitle: string;
  reason: string;
}

interface AutoGroupCriteria {
  by: 'store' | 'category' | 'person' | 'occasion' | 'price_range';
  value?: string; // for filtering results
}

export function registerImportPreviewRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/detect-duplicates - AI-based duplicate detection
  app.fastify.post(
    '/api/detect-duplicates',
    {
      schema: {
        description: 'Detect duplicate items using AI',
        tags: ['import'],
        body: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tempId: { type: 'string' },
                  title: { type: 'string' },
                  imageUrl: { type: 'string' },
                  productUrl: { type: 'string' },
                  sourceDomain: { type: 'string' },
                },
                required: ['tempId', 'title'],
              },
            },
          },
          required: ['items'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              groups: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    groupId: { type: 'string' },
                    members: { type: 'array', items: { type: 'string' } },
                    confidence: { type: 'number' },
                    canonicalTitle: { type: 'string' },
                    reason: { type: 'string' },
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
          items: ImportItem[];
        };
      }>,
      reply: FastifyReply
    ) => {
      const { items } = request.body;

      app.logger.info({ itemCount: items.length }, 'Detecting duplicates');

      if (items.length < 2) {
        app.logger.debug('Not enough items for duplicate detection');
        return { groups: [] };
      }

      try {
        // Prepare item summaries for AI
        const itemSummaries = items.map((item) => ({
          tempId: item.tempId,
          title: item.title,
          domain: item.sourceDomain || 'unknown',
          hasImage: !!item.imageUrl,
          url: item.productUrl || 'unknown',
        }));

        // Use GPT-5.2 to analyze duplicates
        const result = await generateText({
          model: gateway('openai/gpt-5.2'),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are analyzing a list of imported items to find duplicates. Items with the same or very similar product are likely duplicates.

Items to analyze:
${JSON.stringify(itemSummaries, null, 2)}

For each group of duplicate items:
1. Group items that are clearly the same product (same title, similar images, same URL, or very similar product)
2. Only create groups with HIGH confidence (>0.7)
3. For each group, provide:
   - members: array of tempIds that are duplicates
   - confidence: score from 0 to 1 indicating how certain the grouping is
   - canonicalTitle: the best representative title from the group
   - reason: explain why these are grouped (e.g., "Identical product from different stores", "Same item with different size variants")

Return ONLY valid JSON in this exact format:
{
  "groups": [
    { "members": ["tempId1", "tempId2"], "confidence": 0.95, "canonicalTitle": "...", "reason": "..." },
    ...
  ]
}

If no clear duplicates are found, return: { "groups": [] }

Do not include any markdown, explanations, or extra text.`,
                },
              ],
            },
          ],
        });

        // Parse the response
        const parsed = JSON.parse(result.text);
        const groups: DuplicateGroup[] = (parsed.groups || []).map(
          (group: any, index: number) => ({
            groupId: `dup_${Date.now()}_${index}`,
            members: Array.isArray(group.members) ? group.members : [],
            confidence: Math.min(1, Math.max(0, group.confidence || 0)),
            canonicalTitle: group.canonicalTitle || 'Unknown',
            reason: group.reason || 'Potential duplicate detected',
          })
        );

        // Filter groups to only include high-confidence ones
        const highConfidenceGroups = groups.filter(
          (group) => group.members.length >= 2 && group.confidence > 0.7
        );

        app.logger.info(
          { itemCount: items.length, groupCount: highConfidenceGroups.length },
          'Duplicate detection completed'
        );

        return { groups: highConfidenceGroups };
      } catch (error) {
        app.logger.error(
          { err: error, itemCount: items.length },
          'Failed to detect duplicates'
        );
        return reply.status(400).send({
          error: 'Failed to detect duplicates',
        });
      }
    }
  );

  // Helper function to determine default grouping mode
  function determineDefaultMode(
    items: Array<{ sourceDomain?: string }>
  ): 'store' | 'category' {
    const domains = new Set(
      items.filter((i) => i.sourceDomain).map((i) => i.sourceDomain)
    );
    return domains.size > 1 ? 'store' : 'category';
  }

  // POST /api/auto-group-import-items - Auto-group items with smart defaults
  app.fastify.post(
    '/api/auto-group-import-items',
    {
      schema: {
        description: 'Auto-group import items by criteria with smart defaults',
        tags: ['import'],
        body: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tempId: { type: 'string' },
                  title: { type: 'string' },
                  imageUrl: { type: 'string' },
                  productUrl: { type: 'string' },
                  sourceDomain: { type: 'string' },
                  price: { type: 'number' },
                  currency: { type: 'string' },
                },
                required: ['tempId', 'title'],
              },
            },
            mode: {
              type: 'string',
              enum: ['store', 'category', 'person', 'occasion', 'price'],
            },
          },
          required: ['items'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              groups: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    groupName: { type: 'string' },
                    memberTempIds: { type: 'array', items: { type: 'string' } },
                    confidence: { type: 'number' },
                  },
                },
              },
              autoMode: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          items: Array<{
            tempId: string;
            title: string;
            imageUrl?: string;
            productUrl?: string;
            sourceDomain?: string;
            price?: number;
            currency?: string;
          }>;
          mode?: 'store' | 'category' | 'person' | 'occasion' | 'price';
        };
      }>,
      reply: FastifyReply
    ) => {
      const { items } = request.body;
      let { mode } = request.body;

      // Determine mode if not provided
      if (!mode) {
        mode = determineDefaultMode(items);
      }

      app.logger.info(
        { itemCount: items.length, mode },
        'Auto-grouping items'
      );

      try {
        const groupMap: Map<string, string[]> = new Map();

        if (mode === 'store') {
          // Group by source domain
          items.forEach((item) => {
            const domain = item.sourceDomain || 'Other Stores';
            if (!groupMap.has(domain)) {
              groupMap.set(domain, []);
            }
            groupMap.get(domain)!.push(item.tempId);
          });
        } else if (mode === 'price') {
          // Group by price ranges
          items.forEach((item) => {
            const price = item.price || 0;
            let range = 'Unknown';

            if (price < 25) range = 'Under $25';
            else if (price < 50) range = '$25 - $50';
            else if (price < 100) range = '$50 - $100';
            else if (price < 250) range = '$100 - $250';
            else range = 'Over $250';

            if (!groupMap.has(range)) {
              groupMap.set(range, []);
            }
            groupMap.get(range)!.push(item.tempId);
          });
        } else {
          // For category, person, and occasion, use AI to classify
          const prompt =
            mode === 'category'
              ? `Classify these items into product categories. Return a JSON object mapping tempId to category.

Items:
${items.map((i) => `- ${i.tempId}: ${i.title}`).join('\n')}

Common categories: Electronics, Clothing, Home & Kitchen, Books, Toys, Beauty, Sports, Gifts, Food, etc.

Return ONLY valid JSON:
{
  "tempId1": "category name",
  "tempId2": "category name"
}

Do not include markdown or explanations.`
              : mode === 'person'
                ? `Detect person/recipient patterns in these items. Look for keywords like "for mom", "dad's", person names, relationships like sister/friend.

Items:
${items.map((i) => `- ${i.tempId}: ${i.title}`).join('\n')}

Return a JSON object mapping tempId to recipient (person name or relationship):
{
  "tempId1": "Mom",
  "tempId2": "Sarah",
  "tempId3": "Dad"
}

Use names or relationships found in the titles. If unclear, use "General/Self".

Do not include markdown or explanations.`
                : `Detect occasions/events in these items. Look for keywords like birthday, wedding, christmas, anniversary, graduation, valentine, halloween, etc.

Items:
${items.map((i) => `- ${i.tempId}: ${i.title}`).join('\n')}

Return a JSON object mapping tempId to occasion:
{
  "tempId1": "Birthday",
  "tempId2": "Wedding",
  "tempId3": "General"
}

If no clear occasion, use "General".

Do not include markdown or explanations.`;

          const result = await generateText({
            model: gateway('openai/gpt-5.2'),
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: prompt,
                  },
                ],
              },
            ],
          });

          const classification = JSON.parse(result.text);
          items.forEach((item) => {
            const groupLabel =
              classification[item.tempId] || 'Uncategorized';
            if (!groupMap.has(groupLabel)) {
              groupMap.set(groupLabel, []);
            }
            groupMap.get(groupLabel)!.push(item.tempId);
          });
        }

        const groups = Array.from(groupMap.entries()).map((entry) => ({
          groupName: entry[0],
          memberTempIds: entry[1],
          confidence: entry[1].length > 1 ? 0.85 : 0.95, // Higher confidence for single items
        }));

        app.logger.info(
          { itemCount: items.length, groupCount: groups.length, mode },
          'Items auto-grouped'
        );

        return { groups, autoMode: mode };
      } catch (error) {
        app.logger.error(
          { err: error, mode, itemCount: items.length },
          'Failed to auto-group items'
        );
        return reply.status(400).send({
          error: 'Failed to auto-group items',
        });
      }
    }
  );

  // POST /api/import-items/auto-group - Backward compatible endpoint (deprecated)
  app.fastify.post(
    '/api/import-items/auto-group',
    {
      schema: {
        description: 'Auto-group import items by criteria (deprecated, use /api/auto-group-import-items)',
        tags: ['import'],
        body: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tempId: { type: 'string' },
                  title: { type: 'string' },
                  sourceDomain: { type: 'string' },
                  price: { type: 'number' },
                  currency: { type: 'string' },
                },
              },
            },
            groupBy: {
              type: 'string',
              enum: ['store', 'category', 'person', 'occasion', 'price_range'],
            },
          },
          required: ['items', 'groupBy'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              groups: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    groupId: { type: 'string' },
                    label: { type: 'string' },
                    items: {
                      type: 'array',
                      items: { type: 'string' },
                    },
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
          items: Array<{
            tempId: string;
            title: string;
            sourceDomain?: string;
            price?: number;
            currency?: string;
          }>;
          groupBy: 'store' | 'category' | 'person' | 'occasion' | 'price_range';
        };
      }>,
      reply: FastifyReply
    ) => {
      const { items, groupBy } = request.body;

      // Delegate to new endpoint
      const modeMap: { [key: string]: string } = {
        store: 'store',
        category: 'category',
        person: 'person',
        occasion: 'occasion',
        price_range: 'price',
      };

      return app.fastify.inject({
        method: 'POST',
        url: '/api/auto-group-import-items',
        payload: { items, mode: modeMap[groupBy] },
      });
    }
  );

  // POST /api/import-items/update - Update import item details
  app.fastify.post(
    '/api/import-items/update',
    {
      schema: {
        description: 'Update import item details',
        tags: ['import'],
        body: {
          type: 'object',
          properties: {
            tempId: { type: 'string' },
            title: { type: 'string' },
            imageUrl: { type: 'string' },
            productUrl: { type: 'string' },
            price: { type: 'number' },
            currency: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['tempId'],
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
          tempId: string;
          title?: string;
          imageUrl?: string;
          productUrl?: string;
          price?: number;
          currency?: string;
          notes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { tempId, title, imageUrl, productUrl, price, currency } =
        request.body;

      app.logger.info({ tempId, title }, 'Updating import item');

      // This is a client-side operation, we just validate and acknowledge
      // The actual data is stored locally in the app until import
      try {
        app.logger.debug(
          { tempId, hasTitle: !!title, hasImage: !!imageUrl },
          'Import item updated'
        );

        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, tempId }, 'Failed to update item');
        return reply.status(400).send({ error: 'Failed to update item' });
      }
    }
  );

  // POST /api/wishlists/create - Create new wishlist
  app.fastify.post(
    '/api/wishlists/create',
    {
      schema: {
        description: 'Create a new wishlist',
        tags: ['wishlists', 'import'],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { name } = request.body;

      app.logger.info({ userId, name }, 'Creating new wishlist');

      try {
        const [newWishlist] = await app.db
          .insert(schema.wishlists)
          .values({
            userId,
            name,
          })
          .returning();

        app.logger.info({ wishlistId: newWishlist.id, name }, 'Wishlist created');

        reply.status(201);
        return {
          id: newWishlist.id,
          name: newWishlist.name,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, name },
          'Failed to create wishlist'
        );
        return reply.status(500).send({ error: 'Failed to create wishlist' });
      }
    }
  );

  // POST /api/import-items/batch - Batch import items into wishlist
  app.fastify.post(
    '/api/import-items/batch',
    {
      schema: {
        description: 'Batch import items into wishlist',
        tags: ['import'],
        body: {
          type: 'object',
          properties: {
            wishlistId: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  imageUrl: { type: 'string' },
                  productUrl: { type: 'string' },
                  price: { type: 'number' },
                  currency: { type: 'string' },
                  sourceDomain: { type: 'string' },
                  notes: { type: 'string' },
                },
                required: ['title'],
              },
            },
          },
          required: ['wishlistId', 'items'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              createdCount: { type: 'number' },
              warnings: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          wishlistId: string;
          items: Array<{
            title: string;
            imageUrl?: string;
            productUrl?: string;
            price?: number;
            currency?: string;
            sourceDomain?: string;
            notes?: string;
          }>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { wishlistId, items } = request.body;

      app.logger.info(
        { userId, wishlistId, itemCount: items.length },
        'Batch importing items'
      );

      try {
        // Verify wishlist ownership
        const wishlist = await app.db.query.wishlists.findFirst({
          where: eq(schema.wishlists.id, wishlistId),
        });

        if (!wishlist || wishlist.userId !== userId) {
          app.logger.warn({ wishlistId, userId }, 'Wishlist not found');
          return reply.status(404).send({ error: 'Wishlist not found' });
        }

        let createdCount = 0;
        const warnings: string[] = [];

        for (const item of items) {
          try {
            await app.db.insert(schema.wishlistItems).values({
              wishlistId,
              title: item.title,
              imageUrl: item.imageUrl || null,
              currentPrice: item.price ? item.price.toString() : null,
              currency: item.currency || 'USD',
              originalUrl: item.productUrl || null,
              sourceDomain: item.sourceDomain || null,
              notes: item.notes || null,
            });
            createdCount++;
          } catch (itemError) {
            app.logger.warn(
              { err: itemError, itemTitle: item.title },
              'Failed to insert item'
            );
            warnings.push(`Failed to import "${item.title}"`);
          }
        }

        app.logger.info(
          { wishlistId, createdCount, warningCount: warnings.length },
          'Batch import completed'
        );

        return {
          success: true,
          createdCount,
          warnings,
        };
      } catch (error) {
        app.logger.error(
          { err: error, wishlistId, userId },
          'Failed to batch import items'
        );
        return reply.status(500).send({
          error: 'Failed to import items',
        });
      }
    }
  );

  // POST /api/import-execute - Execute import with mode support and location checking
  app.fastify.post(
    '/api/import-execute',
    {
      schema: {
        description: 'Execute import with merge/new/split modes and location checking',
        tags: ['import'],
        body: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['merge', 'new', 'split'] },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  imageUrl: { type: 'string' },
                  productUrl: { type: 'string' },
                  price: { type: 'number' },
                  currency: { type: 'string' },
                  sourceDomain: { type: 'string' },
                },
                required: ['title'],
              },
            },
            wishlistId: { type: 'string' },
            wishlistName: { type: 'string' },
            groups: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  groupName: { type: 'string' },
                  memberTempIds: { type: 'array', items: { type: 'string' } },
                  wishlistId: { type: 'string' },
                },
              },
            },
            countryCode: { type: 'string' },
            city: { type: 'string' },
          },
          required: ['mode', 'items'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              createdCount: { type: 'number' },
              destinationWishlists: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
              itemAvailability: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    tempId: { type: 'string' },
                    sourceDomain: { type: 'string' },
                    available: { type: 'boolean' },
                    reason: { type: 'string' },
                  },
                },
              },
              warnings: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          mode: 'merge' | 'new' | 'split';
          items: Array<{
            tempId?: string;
            title: string;
            imageUrl?: string;
            productUrl?: string;
            price?: number;
            currency?: string;
            sourceDomain?: string;
          }>;
          wishlistId?: string;
          wishlistName?: string;
          groups?: Array<{
            groupName: string;
            memberTempIds: string[];
            wishlistId?: string;
          }>;
          countryCode?: string;
          city?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { mode, items, wishlistId, wishlistName, groups, countryCode, city } =
        request.body;

      app.logger.info(
        { userId, mode, itemCount: items.length, countryCode },
        'Executing import'
      );

      try {
        // Check location availability for each item
        const itemAvailability = await Promise.all(
          items.map(async (item) => {
            const availability = {
              tempId: item.tempId || item.title,
              sourceDomain: item.sourceDomain || 'unknown',
              available: true,
              reason: '',
            };

            // Skip availability check if no location provided
            if (!countryCode || !item.sourceDomain) {
              return availability;
            }

            // Check store in database
            try {
              const dbStore = await app.db.query.stores.findFirst({
                where: eq(schema.stores.domain, item.sourceDomain),
                with: { shippingRules: true },
              });

              if (!dbStore) {
                // Store not in database, assume available
                return availability;
              }

              // Parse countriesSupported
              const supportedCountries = typeof dbStore.countriesSupported === 'string'
                ? JSON.parse(dbStore.countriesSupported)
                : dbStore.countriesSupported;

              if (!supportedCountries.includes(countryCode)) {
                availability.available = false;
                availability.reason = 'Store does not ship to your country';
                return availability;
              }

              // Check shipping rules for this country
              const shippingRule = dbStore.shippingRules.find(
                (rule) => rule.countryCode === countryCode
              );

              if (shippingRule && !shippingRule.shipsToCountry) {
                availability.available = false;
                availability.reason = 'Store does not ship to your country';
                return availability;
              }

              // Check city-level filtering
              if (dbStore.requiresCity && city && shippingRule) {
                const blacklist = shippingRule.cityBlacklist
                  ? (typeof shippingRule.cityBlacklist === 'string'
                      ? JSON.parse(shippingRule.cityBlacklist)
                      : shippingRule.cityBlacklist)
                  : null;

                if (blacklist && blacklist.includes(city)) {
                  availability.available = false;
                  availability.reason = 'Store does not ship to your city';
                  return availability;
                }

                const whitelist = shippingRule.cityWhitelist
                  ? (typeof shippingRule.cityWhitelist === 'string'
                      ? JSON.parse(shippingRule.cityWhitelist)
                      : shippingRule.cityWhitelist)
                  : null;

                if (whitelist && whitelist.length > 0 && !whitelist.includes(city)) {
                  availability.available = false;
                  availability.reason = 'Store does not ship to your city';
                  return availability;
                }

                if (!shippingRule.shipsToCity) {
                  availability.available = false;
                  availability.reason = 'Store does not ship to your city';
                  return availability;
                }
              }

              return availability;
            } catch (error) {
              app.logger.debug({ err: error, domain: item.sourceDomain }, 'Location check error');
              return availability; // Assume available on error
            }
          })
        );

        // Execute import based on mode
        let createdCount = 0;
        const warnings: string[] = [];
        const destinationWishlists: Array<{ id: string; name: string }> = [];

        if (mode === 'merge') {
          // Merge into existing wishlist
          if (!wishlistId) {
            return reply.status(400).send({ error: 'wishlistId required for merge mode' });
          }

          const wishlist = await app.db.query.wishlists.findFirst({
            where: eq(schema.wishlists.id, wishlistId),
          });

          if (!wishlist || wishlist.userId !== userId) {
            return reply.status(404).send({ error: 'Wishlist not found' });
          }

          for (const item of items) {
            try {
              await app.db.insert(schema.wishlistItems).values({
                wishlistId,
                title: item.title,
                imageUrl: item.imageUrl || null,
                currentPrice: item.price ? item.price.toString() : null,
                currency: item.currency || 'USD',
                originalUrl: item.productUrl || null,
                sourceDomain: item.sourceDomain || null,
              });
              createdCount++;
            } catch (itemError) {
              app.logger.warn({ err: itemError, title: item.title }, 'Failed to insert item');
              warnings.push(`Failed to import "${item.title}"`);
            }
          }

          destinationWishlists.push({
            id: wishlist.id,
            name: wishlist.name,
          });
        } else if (mode === 'new') {
          // Create new wishlist and import
          if (!wishlistName) {
            return reply.status(400).send({ error: 'wishlistName required for new mode' });
          }

          const [newWishlist] = await app.db
            .insert(schema.wishlists)
            .values({ userId, name: wishlistName })
            .returning();

          for (const item of items) {
            try {
              await app.db.insert(schema.wishlistItems).values({
                wishlistId: newWishlist.id,
                title: item.title,
                imageUrl: item.imageUrl || null,
                currentPrice: item.price ? item.price.toString() : null,
                currency: item.currency || 'USD',
                originalUrl: item.productUrl || null,
                sourceDomain: item.sourceDomain || null,
              });
              createdCount++;
            } catch (itemError) {
              app.logger.warn({ err: itemError, title: item.title }, 'Failed to insert item');
              warnings.push(`Failed to import "${item.title}"`);
            }
          }

          destinationWishlists.push({
            id: newWishlist.id,
            name: newWishlist.name,
          });
        } else if (mode === 'split') {
          // Split items into multiple wishlists by groups
          if (!groups || groups.length === 0) {
            return reply.status(400).send({ error: 'groups required for split mode' });
          }

          for (const group of groups) {
            let targetWishlistId = group.wishlistId;

            // Create new wishlist if not specified
            if (!targetWishlistId) {
              const [newWishlist] = await app.db
                .insert(schema.wishlists)
                .values({ userId, name: group.groupName })
                .returning();
              targetWishlistId = newWishlist.id;
              destinationWishlists.push({
                id: newWishlist.id,
                name: newWishlist.name,
              });
            } else {
              // Verify ownership of existing wishlist
              const wishlist = await app.db.query.wishlists.findFirst({
                where: eq(schema.wishlists.id, targetWishlistId),
              });
              if (!wishlist || wishlist.userId !== userId) {
                warnings.push(`Wishlist ${group.groupName} not found`);
                continue;
              }
              destinationWishlists.push({
                id: wishlist.id,
                name: wishlist.name,
              });
            }

            // Insert items from this group
            for (const tempId of group.memberTempIds) {
              const item = items.find((i) => (i.tempId || i.title) === tempId);
              if (!item) continue;

              try {
                await app.db.insert(schema.wishlistItems).values({
                  wishlistId: targetWishlistId,
                  title: item.title,
                  imageUrl: item.imageUrl || null,
                  currentPrice: item.price ? item.price.toString() : null,
                  currency: item.currency || 'USD',
                  originalUrl: item.productUrl || null,
                  sourceDomain: item.sourceDomain || null,
                });
                createdCount++;
              } catch (itemError) {
                app.logger.warn({ err: itemError, title: item.title }, 'Failed to insert item');
                warnings.push(`Failed to import "${item.title}"`);
              }
            }
          }
        }

        app.logger.info(
          {
            mode,
            createdCount,
            destinationCount: destinationWishlists.length,
            warningCount: warnings.length,
          },
          'Import executed'
        );

        return {
          success: true,
          createdCount,
          destinationWishlists,
          itemAvailability,
          warnings,
        };
      } catch (error) {
        app.logger.error(
          { err: error, mode, userId },
          'Failed to execute import'
        );
        return reply.status(500).send({
          error: 'Failed to execute import',
        });
      }
    }
  );
}
