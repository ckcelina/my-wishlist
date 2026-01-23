import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

export function registerUploadRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // POST /api/upload/image - Upload image file
  app.fastify.post(
    '/api/upload/image',
    {
      schema: {
        description: 'Upload an image file',
        tags: ['upload'],
        consumes: ['multipart/form-data'],
        response: {
          200: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              filename: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, 'Uploading image');

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

        // Generate storage key
        const timestamp = Date.now();
        const sanitizedFilename = data.filename
          .replace(/[^a-z0-9.-]/gi, '_')
          .toLowerCase();
        const storageKey = `uploads/${userId}/${timestamp}-${sanitizedFilename}`;

        // Upload to storage
        const uploadedKey = await app.storage.upload(storageKey, buffer);

        // Generate signed URL
        const { url } = await app.storage.getSignedUrl(uploadedKey);

        app.logger.info(
          { userId, filename: data.filename, storageKey: uploadedKey },
          'Image uploaded successfully'
        );

        return {
          url,
          filename: data.filename,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId },
          'Failed to upload image'
        );
        return reply.status(500).send({ error: 'Failed to upload image' });
      }
    }
  );
}
