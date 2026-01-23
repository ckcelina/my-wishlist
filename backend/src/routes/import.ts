import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

interface ImportedItem {
  title: string;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  productUrl: string;
}

interface ImportWishlistResponse {
  storeName: string;
  items: ImportedItem[];
}

// Function to detect store name from URL
function detectStoreName(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes('amazon')) return 'Amazon';
  if (hostname.includes('etsy')) return 'Etsy';
  if (hostname.includes('target')) return 'Target';
  if (hostname.includes('walmart')) return 'Walmart';
  if (hostname.includes('bestbuy')) return 'Best Buy';
  if (hostname.includes('ebay')) return 'eBay';
  if (hostname.includes('pinterest')) return 'Pinterest';
  if (hostname.includes('shein')) return 'Shein';
  if (hostname.includes('asos')) return 'ASOS';
  if (hostname.includes('zara')) return 'Zara';
  if (hostname.includes('h&m')) return 'H&M';
  if (hostname.includes('uniqlo')) return 'Uniqlo';
  if (hostname.includes('forever21')) return 'Forever 21';
  if (hostname.includes('gap')) return 'Gap';
  if (hostname.includes('nordstrom')) return 'Nordstrom';
  if (hostname.includes('sephora')) return 'Sephora';
  if (hostname.includes('ulta')) return 'Ulta';
  if (hostname.includes('ikea')) return 'IKEA';
  if (hostname.includes('wayfair')) return 'Wayfair';
  if (hostname.includes('homedepot')) return 'Home Depot';
  if (hostname.includes('lowes')) return "Lowe's";

  // Default: extract main domain
  return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
}

// Function to fetch webpage content
async function fetchWebContent(url: string, logger: any): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status, url },
        'Failed to fetch webpage'
      );
      return '';
    }

    return await response.text();
  } catch (error) {
    logger.error({ err: error, url }, 'Error fetching webpage');
    return '';
  }
}

export function registerImportRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/import-wishlist - Import wishlist from external store
  app.fastify.post(
    '/api/import-wishlist',
    {
      schema: {
        description: 'Import items from an external store wishlist',
        tags: ['import'],
        body: {
          type: 'object',
          properties: {
            wishlistUrl: { type: 'string' },
          },
          required: ['wishlistUrl'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              storeName: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    imageUrl: { type: ['string', 'null'] },
                    price: { type: ['number', 'null'] },
                    currency: { type: ['string', 'null'] },
                    productUrl: { type: 'string' },
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
        Body: { wishlistUrl: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { wishlistUrl } = request.body;

      app.logger.info({ wishlistUrl }, 'Starting wishlist import');

      try {
        // Detect store name
        const storeName = detectStoreName(wishlistUrl);
        app.logger.info({ storeName }, 'Detected store');

        // Fetch the webpage content
        app.logger.info({ url: wishlistUrl }, 'Fetching webpage content');
        const htmlContent = await fetchWebContent(wishlistUrl, app.logger);

        if (!htmlContent) {
          app.logger.warn({ url: wishlistUrl }, 'Failed to fetch webpage');
          return reply.status(400).send({
            error: 'Failed to fetch wishlist page',
          });
        }

        // Use GPT-5.2 to parse and extract items
        app.logger.info('Parsing items with AI');
        const result = await generateText({
          model: gateway('openai/gpt-5.2'),
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Parse this ${storeName} wishlist/cart HTML and extract ALL items you can find. For each item, extract:
- title: product/item name (string, required)
- imageUrl: best quality product image URL (string or null)
- price: numeric price if visible (number or null)
- currency: currency code (USD, EUR, GBP, etc. or null, default to null if not found)
- productUrl: full URL to the product page (string, required)

Be thorough and extract as many items as possible.

Return ONLY a valid JSON array of objects, no markdown or extra text:
[
  { "title": "...", "imageUrl": "...", "price": 29.99, "currency": "USD", "productUrl": "..." },
  ...
]

If currency is not visible, use null. If price is not visible, use null.

HTML Content:
${htmlContent.substring(0, 8000)}`,
                },
              ],
            },
          ],
        });

        // Parse the AI response
        let items: ImportedItem[] = [];
        try {
          // Extract JSON array from response
          const jsonMatch = result.text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            items = Array.isArray(parsed)
              ? parsed.map((item: any) => ({
                  title: item.title || 'Unknown Item',
                  imageUrl: item.imageUrl || null,
                  price:
                    item.price !== null && item.price !== undefined
                      ? parseFloat(item.price)
                      : null,
                  currency: item.currency || null,
                  productUrl: item.productUrl || '',
                }))
              : [];
          }
        } catch (parseError) {
          app.logger.warn(
            { err: parseError },
            'Failed to parse AI response as JSON'
          );
          items = [];
        }

        // Filter out items with missing required fields
        items = items.filter((item) => item.title && item.productUrl);

        app.logger.info(
          { storeName, itemCount: items.length },
          'Wishlist import completed'
        );

        return {
          storeName,
          items,
        };
      } catch (error) {
        app.logger.error(
          { err: error, wishlistUrl },
          'Failed to import wishlist'
        );
        return reply.status(400).send({
          error: 'Failed to import wishlist',
        });
      }
    }
  );

  // POST /api/import-wishlist/save - Save imported items to a wishlist
  app.fastify.post(
    '/api/import-wishlist/save',
    {
      schema: {
        description: 'Save imported items to a wishlist',
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
                  imageUrl: { type: ['string', 'null'] },
                  price: { type: ['number', 'null'] },
                  currency: { type: ['string', 'null'] },
                  productUrl: { type: 'string' },
                },
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
              warnings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    warning: { type: 'string' },
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
          items: ImportedItem[];
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { wishlistId, items } = request.body;

      app.logger.info(
        { wishlistId, userId, itemCount: items.length },
        'Saving imported items'
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

        // Get user's location for availability checks
        const userLocation = await app.db.query.userLocation.findFirst({
          where: eq(schema.userLocation.userId, userId),
        });

        // Insert items with availability checks
        let createdCount = 0;
        const warnings: { title: string; warning: string }[] = [];

        for (const item of items) {
          try {
            const urlObj = new URL(item.productUrl);
            const sourceDomain = urlObj.hostname;

            // Check store availability if user has location
            if (userLocation && sourceDomain) {
              const dbStore = await app.db.query.stores.findFirst({
                where: eq(schema.stores.domain, sourceDomain),
                with: { shippingRules: true },
              });

              if (dbStore) {
                const supportedCountries = typeof dbStore.countriesSupported === 'string'
                  ? JSON.parse(dbStore.countriesSupported)
                  : dbStore.countriesSupported;

                if (!supportedCountries.includes(userLocation.countryCode)) {
                  warnings.push({
                    title: item.title,
                    warning: 'May not deliver to your location',
                  });
                  app.logger.debug(
                    { domain: sourceDomain, countryCode: userLocation.countryCode },
                    'Store not available in user location'
                  );
                }
              }
            }

            await app.db.insert(schema.wishlistItems).values({
              wishlistId,
              title: item.title,
              imageUrl: item.imageUrl,
              currentPrice: item.price ? item.price.toString() : null,
              currency: item.currency || 'USD',
              originalUrl: item.productUrl,
              sourceDomain,
            });

            createdCount++;
          } catch (itemError) {
            app.logger.warn(
              { err: itemError, itemTitle: item.title },
              'Failed to insert item'
            );
            // Continue with next item
          }
        }

        app.logger.info(
          { wishlistId, createdCount, warningCount: warnings.length },
          'Items imported successfully'
        );

        return {
          success: true,
          createdCount,
          warnings,
        };
      } catch (error) {
        app.logger.error(
          { err: error, wishlistId, userId },
          'Failed to save imported items'
        );
        return reply.status(500).send({
          error: 'Failed to save imported items',
        });
      }
    }
  );

  // POST /api/import-wishlist/create-and-save - Create new wishlist and save imported items
  app.fastify.post(
    '/api/import-wishlist/create-and-save',
    {
      schema: {
        description: 'Create new wishlist and save imported items',
        tags: ['import'],
        body: {
          type: 'object',
          properties: {
            wishlistName: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  imageUrl: { type: ['string', 'null'] },
                  price: { type: ['number', 'null'] },
                  currency: { type: ['string', 'null'] },
                  productUrl: { type: 'string' },
                },
              },
            },
          },
          required: ['wishlistName', 'items'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              wishlistId: { type: 'string' },
              createdCount: { type: 'number' },
              warnings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    warning: { type: 'string' },
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
          wishlistName: string;
          items: ImportedItem[];
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { wishlistName, items } = request.body;

      app.logger.info(
        { wishlistName, userId, itemCount: items.length },
        'Creating wishlist and importing items'
      );

      try {
        // Create new wishlist
        const [newWishlist] = await app.db
          .insert(schema.wishlists)
          .values({
            userId,
            name: wishlistName,
          })
          .returning();

        app.logger.info({ wishlistId: newWishlist.id }, 'Wishlist created');

        // Get user's location for availability checks
        const userLocation = await app.db.query.userLocation.findFirst({
          where: eq(schema.userLocation.userId, userId),
        });

        // Insert items with availability checks
        let createdCount = 0;
        const warnings: { title: string; warning: string }[] = [];

        for (const item of items) {
          try {
            const urlObj = new URL(item.productUrl);
            const sourceDomain = urlObj.hostname;

            // Check store availability if user has location
            if (userLocation && sourceDomain) {
              const dbStore = await app.db.query.stores.findFirst({
                where: eq(schema.stores.domain, sourceDomain),
                with: { shippingRules: true },
              });

              if (dbStore) {
                const supportedCountries = typeof dbStore.countriesSupported === 'string'
                  ? JSON.parse(dbStore.countriesSupported)
                  : dbStore.countriesSupported;

                if (!supportedCountries.includes(userLocation.countryCode)) {
                  warnings.push({
                    title: item.title,
                    warning: 'May not deliver to your location',
                  });
                  app.logger.debug(
                    { domain: sourceDomain, countryCode: userLocation.countryCode },
                    'Store not available in user location'
                  );
                }
              }
            }

            await app.db.insert(schema.wishlistItems).values({
              wishlistId: newWishlist.id,
              title: item.title,
              imageUrl: item.imageUrl,
              currentPrice: item.price ? item.price.toString() : null,
              currency: item.currency || 'USD',
              originalUrl: item.productUrl,
              sourceDomain,
            });

            createdCount++;
          } catch (itemError) {
            app.logger.warn(
              { err: itemError, itemTitle: item.title },
              'Failed to insert item'
            );
            // Continue with next item
          }
        }

        app.logger.info(
          { wishlistId: newWishlist.id, createdCount, warningCount: warnings.length },
          'Wishlist created and items imported'
        );

        return {
          success: true,
          wishlistId: newWishlist.id,
          createdCount,
          warnings,
        };
      } catch (error) {
        app.logger.error(
          { err: error, wishlistName, userId },
          'Failed to create wishlist and import items'
        );
        return reply.status(500).send({
          error: 'Failed to create wishlist and import items',
        });
      }
    }
  );
}
