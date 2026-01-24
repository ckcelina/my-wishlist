import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

export function registerUploadRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/upload/image - Upload image file (with temp flag)
  app.fastify.post(
    '/api/upload/image',
    {
      schema: {
        description: 'Upload an image file',
        tags: ['upload'],
        consumes: ['multipart/form-data'],
        querystring: {
          type: 'object',
          properties: {
            temp: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              filename: { type: 'string' },
              storageKey: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          temp?: boolean | string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const isTemp = request.query.temp === 'true' || request.query.temp === true;

      app.logger.info({ userId, isTemp }, 'Uploading image');

      try {
        // Set file size limit to 10MB
        const options = { limits: { fileSize: 10 * 1024 * 1024 } };
        const data = await request.file(options);

        if (!data) {
          app.logger.warn({ userId }, 'No file provided');
          return reply.status(400).send({ error: 'No file provided' });
        }

        let buffer: Buffer;
        try {
          buffer = await data.toBuffer();
        } catch (err) {
          app.logger.error(
            { err, userId, filename: data.filename },
            'File too large'
          );
          return reply.status(413).send({ error: 'File too large' });
        }

        // Validate file type
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimes.includes(data.mimetype)) {
          app.logger.warn(
            { userId, mimetype: data.mimetype },
            'Invalid file type'
          );
          return reply.status(400).send({
            error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF',
          });
        }

        // Generate storage key with temp or permanent folder
        const timestamp = Date.now();
        const sanitizedFilename = data.filename
          .replace(/[^a-z0-9.-]/gi, '_')
          .toLowerCase();
        const folder = isTemp ? 'temp' : 'uploads';
        const storageKey = `${folder}/${userId}/${timestamp}-${sanitizedFilename}`;

        // Upload to storage
        const uploadedKey = await app.storage.upload(storageKey, buffer);

        // Generate signed URL
        const { url } = await app.storage.getSignedUrl(uploadedKey);

        app.logger.info(
          { userId, filename: data.filename, storageKey: uploadedKey, isTemp },
          'Image uploaded successfully'
        );

        return {
          url,
          filename: data.filename,
          storageKey: uploadedKey,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, isTemp },
          'Failed to upload image'
        );
        return reply.status(500).send({ error: 'Failed to upload image' });
      }
    }
  );

  // POST /api/items/move-temp-image - Move temp image to permanent location
  app.fastify.post(
    '/api/items/move-temp-image',
    {
      schema: {
        description: 'Move temporary image to permanent storage',
        tags: ['upload', 'items'],
        body: {
          type: 'object',
          properties: {
            tempStorageKey: { type: 'string' },
          },
          required: ['tempStorageKey'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              storageKey: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          tempStorageKey: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { tempStorageKey } = request.body;

      app.logger.info({ userId, tempStorageKey }, 'Moving temp image to permanent');

      try {
        // Validate that temp key belongs to user
        if (!tempStorageKey.includes(`/temp/${userId}/`)) {
          app.logger.warn({ userId, tempStorageKey }, 'Unauthorized temp image access');
          return reply.status(403).send({ error: 'Unauthorized' });
        }

        // Download from temp location
        const tempFile = await app.storage.download(tempStorageKey);

        // Generate permanent storage key
        const filename = tempStorageKey.split('/').pop() || 'image';
        const permanentKey = `uploads/${userId}/${filename}`;

        // Upload to permanent location
        const uploadedKey = await app.storage.upload(permanentKey, tempFile);

        // Delete temp file
        try {
          await app.storage.delete(tempStorageKey);
        } catch (deleteError) {
          app.logger.debug(
            { err: deleteError, tempStorageKey },
            'Failed to delete temp image'
          );
          // Don't fail if temp delete fails
        }

        // Generate signed URL
        const { url } = await app.storage.getSignedUrl(uploadedKey);

        app.logger.info(
          { userId, tempStorageKey, permanentKey: uploadedKey },
          'Image moved to permanent storage'
        );

        return {
          url,
          storageKey: uploadedKey,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId, tempStorageKey },
          'Failed to move image'
        );
        return reply.status(500).send({ error: 'Failed to move image' });
      }
    }
  );

  // DELETE /api/items/delete-temp-image - Delete temporary image
  app.fastify.delete(
    '/api/items/delete-temp-image',
    {
      schema: {
        description: 'Delete temporary image',
        tags: ['upload', 'items'],
        querystring: {
          type: 'object',
          properties: {
            storageKey: { type: 'string' },
          },
          required: ['storageKey'],
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
        Querystring: {
          storageKey: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const storageKey = request.query.storageKey;

      if (!storageKey) {
        return reply.status(400).send({ error: 'storageKey is required' });
      }

      app.logger.info({ userId, storageKey }, 'Deleting temp image');

      try {
        // Validate that temp key belongs to user
        if (!storageKey.includes(`/temp/${userId}/`)) {
          app.logger.warn({ userId, storageKey }, 'Unauthorized temp image access');
          return reply.status(403).send({ error: 'Unauthorized' });
        }

        // Delete temp file
        await app.storage.delete(storageKey);

        app.logger.info({ userId, storageKey }, 'Temp image deleted');

        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, userId, storageKey },
          'Failed to delete temp image'
        );
        return reply.status(500).send({ error: 'Failed to delete temp image' });
      }
    }
  );
}
