import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

type ReportType =
  | 'wrong_product_match'
  | 'wrong_price'
  | 'store_not_available'
  | 'broken_link'
  | 'image_issue'
  | 'other';

type ReportContext = 'item_detail' | 'confirm_product' | 'import_preview';

type ReportStatus = 'open' | 'triaged' | 'resolved' | 'closed';

const VALID_REPORT_TYPES: ReportType[] = [
  'wrong_product_match',
  'wrong_price',
  'store_not_available',
  'broken_link',
  'image_issue',
  'other',
];

const VALID_CONTEXTS: ReportContext[] = [
  'item_detail',
  'confirm_product',
  'import_preview',
];

const VALID_STATUSES: ReportStatus[] = ['open', 'triaged', 'resolved', 'closed'];

export function registerReportRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/reports - Create a new report
  app.fastify.post(
    '/api/reports',
    {
      schema: {
        description: 'Create a new user report',
        tags: ['reports'],
        body: {
          type: 'object',
          properties: {
            reportType: { type: 'string' },
            context: { type: 'string' },
            itemId: { type: 'string' },
            wishlistId: { type: 'string' },
            details: { type: 'string' },
            suggestedFix: { type: ['string', 'object'] },
            attachmentUrl: { type: 'string' },
          },
          required: ['reportType', 'context', 'details'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              reportType: { type: 'string' },
              context: { type: 'string' },
              details: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          reportType: string;
          context: string;
          itemId?: string;
          wishlistId?: string;
          details: string;
          suggestedFix?: string | Record<string, any>;
          attachmentUrl?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const {
        reportType,
        context,
        itemId,
        wishlistId,
        details,
        suggestedFix,
        attachmentUrl,
      } = request.body;

      app.logger.info(
        { userId, reportType, context },
        'Creating user report'
      );

      // Validate report type
      if (!VALID_REPORT_TYPES.includes(reportType as ReportType)) {
        app.logger.warn(
          { reportType, validTypes: VALID_REPORT_TYPES },
          'Invalid report type'
        );
        return reply.status(400).send({
          error: `Invalid report type. Must be one of: ${VALID_REPORT_TYPES.join(', ')}`,
        });
      }

      // Validate context
      if (!VALID_CONTEXTS.includes(context as ReportContext)) {
        app.logger.warn(
          { context, validContexts: VALID_CONTEXTS },
          'Invalid context'
        );
        return reply.status(400).send({
          error: `Invalid context. Must be one of: ${VALID_CONTEXTS.join(', ')}`,
        });
      }

      try {
        // Convert suggestedFix to string if it's an object
        const suggestedFixStr = suggestedFix
          ? typeof suggestedFix === 'string'
            ? suggestedFix
            : JSON.stringify(suggestedFix)
          : null;

        const [report] = await app.db
          .insert(schema.userReports)
          .values({
            userId,
            reportType: reportType as ReportType,
            context: context as ReportContext,
            itemId: itemId || null,
            wishlistId: wishlistId || null,
            details,
            suggestedFix: suggestedFixStr,
            attachmentUrl: attachmentUrl || null,
          })
          .returning();

        app.logger.info(
          { reportId: report.id, reportType, userId },
          'Report created'
        );

        reply.status(201);
        return {
          id: report.id,
          reportType: report.reportType,
          context: report.context,
          details: report.details,
          status: report.status,
          createdAt: report.createdAt.toISOString(),
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, reportType },
          'Failed to create report'
        );
        return reply.status(500).send({
          error: 'Failed to create report',
        });
      }
    }
  );

  // GET /api/reports - Get user's reports
  app.fastify.get(
    '/api/reports',
    {
      schema: {
        description: 'Get user reports',
        tags: ['reports'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                reportType: { type: 'string' },
                context: { type: 'string' },
                itemId: { type: ['string', 'null'] },
                wishlistId: { type: ['string', 'null'] },
                details: { type: 'string' },
                suggestedFix: { type: ['string', 'null'] },
                attachmentUrl: { type: ['string', 'null'] },
                status: { type: 'string' },
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

      app.logger.info({ userId }, 'Fetching user reports');

      try {
        const reports = await app.db
          .select()
          .from(schema.userReports)
          .where(eq(schema.userReports.userId, userId));

        const formattedReports = reports.map((report) => ({
          id: report.id,
          reportType: report.reportType,
          context: report.context,
          itemId: report.itemId || null,
          wishlistId: report.wishlistId || null,
          details: report.details,
          suggestedFix: report.suggestedFix || null,
          attachmentUrl: report.attachmentUrl || null,
          status: report.status,
          createdAt: report.createdAt.toISOString(),
        }));

        app.logger.info(
          { userId, count: formattedReports.length },
          'User reports retrieved'
        );

        return formattedReports;
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to fetch reports'
        );
        return reply.status(500).send({
          error: 'Failed to fetch reports',
        });
      }
    }
  );

  // GET /api/reports/:id - Get specific report
  app.fastify.get(
    '/api/reports/:id',
    {
      schema: {
        description: 'Get specific report details',
        tags: ['reports'],
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
              reportType: { type: 'string' },
              context: { type: 'string' },
              itemId: { type: ['string', 'null'] },
              wishlistId: { type: ['string', 'null'] },
              details: { type: 'string' },
              suggestedFix: { type: ['string', 'null'] },
              attachmentUrl: { type: ['string', 'null'] },
              status: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params;

      app.logger.info({ reportId: id, userId }, 'Fetching report');

      try {
        const report = await app.db.query.userReports.findFirst({
          where: eq(schema.userReports.id, id),
        });

        if (!report) {
          app.logger.warn({ reportId: id }, 'Report not found');
          return reply.status(404).send({ error: 'Report not found' });
        }

        // Verify ownership
        if (report.userId !== userId) {
          app.logger.warn(
            { reportId: id, userId, reportUserId: report.userId },
            'Unauthorized access to report'
          );
          return reply.status(403).send({ error: 'Unauthorized' });
        }

        app.logger.info({ reportId: id, userId }, 'Report retrieved');

        return {
          id: report.id,
          reportType: report.reportType,
          context: report.context,
          itemId: report.itemId || null,
          wishlistId: report.wishlistId || null,
          details: report.details,
          suggestedFix: report.suggestedFix || null,
          attachmentUrl: report.attachmentUrl || null,
          status: report.status,
          createdAt: report.createdAt.toISOString(),
        };
      } catch (error) {
        app.logger.error(
          { err: error, reportId: id, userId },
          'Failed to fetch report'
        );
        return reply.status(500).send({
          error: 'Failed to fetch report',
        });
      }
    }
  );
}
