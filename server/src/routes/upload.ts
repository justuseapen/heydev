/**
 * File Upload Routes
 * Handles screenshot uploads with image validation and resizing
 */

import { Hono } from 'hono';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';

const MAX_WIDTH = 1200;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const EXTENSION_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

// Get the uploads directory path (relative to server root)
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

/**
 * Ensure the uploads directory exists
 */
async function ensureUploadsDir(): Promise<void> {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

export const uploadRoutes = new Hono();

/**
 * POST /upload - Upload a screenshot file
 * Accepts multipart/form-data with 'file' field
 * Returns JSON with url field pointing to uploaded file
 */
uploadRoutes.post('/', async (c) => {
  try {
    // Ensure uploads directory exists
    await ensureUploadsDir();

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided. Include a "file" field in the form data.' }, 400);
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json(
        {
          error: `Invalid file type "${file.type}". Allowed types: ${ALLOWED_TYPES.join(', ')}`,
        },
        400
      );
    }

    // Get file extension from MIME type
    const extension = EXTENSION_MAP[file.type];

    // Read file contents into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image with sharp
    let processedBuffer: Buffer;
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Resize if width exceeds maximum
    if (metadata.width && metadata.width > MAX_WIDTH) {
      processedBuffer = await image.resize(MAX_WIDTH, null, { withoutEnlargement: true }).toBuffer();
    } else {
      // Keep original but still process through sharp for consistency
      processedBuffer = await image.toBuffer();
    }

    // Generate unique filename
    const filename = `${uuidv4()}.${extension}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    // Write file to disk
    await fs.writeFile(filepath, processedBuffer);

    // Build URL for the uploaded file
    // Use relative URL that will be served by the static route
    const url = `/uploads/${filename}`;

    return c.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Failed to process upload.' }, 500);
  }
});
