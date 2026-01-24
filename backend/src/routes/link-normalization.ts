import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

// List of common URL shortener domains to expand
const SHORTENERS = ['bit.ly', 'tinyurl.com', 'ow.ly', 'short.link', 't.co', 'youtu.be', 'is.gd', 'goo.gl'];

// Parameters to remove from URLs (tracking/analytics)
const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  '_ga',
  '_gid',
  'ref',
  'source',
  'campaign',
];

// Attempt to resolve a shortened URL with timeout
async function expandShortUrl(url: string, logger: any): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Return the final URL after redirects
    return response.url || url;
  } catch (error) {
    logger.debug(
      { err: error, url },
      'Failed to expand shortened URL, using original'
    );
    return url;
  }
}

// Normalize URL by removing tracking params, standardizing domain, etc.
async function normalizeUrl(url: string, logger: any): Promise<string> {
  try {
    const urlObj = new URL(url);

    // Remove www. from domain
    let domain = urlObj.hostname.toLowerCase();
    if (domain.startsWith('www.')) {
      domain = domain.slice(4);
    }
    urlObj.hostname = domain;

    // Check if it's a shortened URL and expand it
    const isShortener = SHORTENERS.some((shortener) => domain.includes(shortener));
    if (isShortener) {
      const expanded = await expandShortUrl(url, logger);
      if (expanded !== url) {
        return normalizeUrl(expanded, logger); // Recursively normalize the expanded URL
      }
    }

    // Remove tracking parameters
    const params = new URLSearchParams(urlObj.search);
    for (const param of TRACKING_PARAMS) {
      params.delete(param);
    }

    // Sort remaining parameters alphabetically for consistent URLs
    const sortedParams = new URLSearchParams([...params.entries()].sort());
    urlObj.search = sortedParams.toString();

    // Remove trailing slash
    let pathname = urlObj.pathname;
    if (pathname.endsWith('/') && pathname !== '/') {
      pathname = pathname.slice(0, -1);
    }
    urlObj.pathname = pathname;

    // Remove hash/fragment
    urlObj.hash = '';

    return urlObj.toString();
  } catch (error) {
    logger.debug(
      { err: error, url },
      'Error normalizing URL, returning original'
    );
    return url;
  }
}

export function registerLinkNormalizationRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/items/normalize-url - Normalize a URL
  app.fastify.post(
    '/api/items/normalize-url',
    {
      schema: {
        description: 'Normalize a URL by removing tracking params and standardizing format',
        tags: ['items'],
        body: {
          type: 'object',
          properties: {
            url: { type: 'string' },
          },
          required: ['url'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              originalUrl: { type: 'string' },
              normalizedUrl: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          url: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { url } = request.body;

      app.logger.info(
        { userId, url },
        'url_normalized'
      );

      try {
        const normalizedUrl = await normalizeUrl(url, app.logger);

        app.logger.info(
          { userId, originalUrl: url, normalizedUrl },
          'URL normalized successfully'
        );

        return {
          originalUrl: url,
          normalizedUrl,
        };
      } catch (error) {
        app.logger.error(
          { err: error, url, userId },
          'Failed to normalize URL'
        );
        return reply.status(400).send({
          error: 'Failed to normalize URL',
        });
      }
    }
  );
}

export { normalizeUrl };
