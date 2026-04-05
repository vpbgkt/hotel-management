/**
 * Upload Service - Hotel Manager API
 * 
 * Storage-agnostic upload service.
 * Default: Local filesystem (./uploads)
 * Production: Set UPLOAD_PROVIDER=s3 with S3/R2 credentials
 * 
 * Supports image optimization via sharp (resize, compress, webp)
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { join, extname } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { createHmac } from 'crypto';

export interface UploadResult {
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  mimeType: string;
}

interface StorageProvider {
  upload(buffer: Buffer, key: string, mimeType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

/**
 * Local File Storage Provider
 * Stores files in ./uploads directory, served via /uploads static route
 */
class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;
  private baseUrl: string;

  constructor() {
    this.uploadDir = join(process.cwd(), 'uploads');
    this.baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
    
    // Ensure upload directories exist
    for (const subdir of ['hotels', 'rooms', 'gallery', 'avatars']) {
      const dir = join(this.uploadDir, subdir);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const filePath = join(this.uploadDir, key);
    const dir = join(filePath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, buffer);
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.uploadDir, key);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/uploads/${key}`;
  }
}

/**
 * S3-Compatible Storage Provider
 * Works with AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, etc.
 * Set UPLOAD_PROVIDER=s3 and configure S3_* environment variables.
 */
class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private endpoint: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private publicUrl: string;
  private readonly logger = new Logger('S3StorageProvider');

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'hotel-uploads';
    this.region = process.env.S3_REGION || 'auto';
    this.endpoint = process.env.S3_ENDPOINT || '';
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || '';
    this.publicUrl = process.env.S3_PUBLIC_URL || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;

    if (!this.accessKeyId || !this.secretAccessKey) {
      this.logger.warn('S3 credentials not configured — uploads may fail');
    }
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const url = this.endpoint
      ? `${this.endpoint}/${this.bucket}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = date.slice(0, 8);
    const contentHash = createHmac('sha256', '').update(buffer).digest('hex');

    // Simplified S3 PUT using fetch with AWS Signature V4 (minimal implementation)
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Length': buffer.length.toString(),
      'x-amz-date': date,
      'x-amz-content-sha256': contentHash,
    };

    // Build canonical request for AWS SigV4
    const canonicalUri = `/${key}`;
    const canonicalQuerystring = '';
    const signedHeaders = Object.keys(headers)
      .map((h) => h.toLowerCase())
      .sort()
      .join(';');
    const canonicalHeaders = Object.keys(headers)
      .map((h) => `${h.toLowerCase()}:${headers[h].trim()}`)
      .sort()
      .join('\n') + '\n';

    const canonicalRequest = [
      'PUT',
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      contentHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      date,
      credentialScope,
      createHmac('sha256', '')
        .update(canonicalRequest)
        .digest('hex'),
    ].join('\n');

    // Derive signing key
    const kDate = createHmac('sha256', `AWS4${this.secretAccessKey}`)
      .update(dateStamp)
      .digest();
    const kRegion = createHmac('sha256', kDate)
      .update(this.region)
      .digest();
    const kService = createHmac('sha256', kRegion).update('s3').digest();
    const kSigning = createHmac('sha256', kService)
      .update('aws4_request')
      .digest();

    const signature = createHmac('sha256', kSigning)
      .update(stringToSign)
      .digest('hex');

    headers[
      'Authorization'
    ] = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const targetUrl = this.endpoint
      ? `${this.endpoint}/${this.bucket}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers,
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`S3 upload failed: ${response.status} ${text}`);
      throw new Error(`S3 upload failed: ${response.status}`);
    }

    this.logger.log(`Uploaded to S3: ${key}`);
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    const targetUrl = this.endpoint
      ? `${this.endpoint}/${this.bucket}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = date.slice(0, 8);

    // Simplified DELETE - for production, use AWS SDK
    try {
      await fetch(targetUrl, { method: 'DELETE' });
      this.logger.log(`Deleted from S3: ${key}`);
    } catch (err) {
      this.logger.warn(`Failed to delete from S3: ${key}`);
    }
  }

  getUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private storage: StorageProvider;

  constructor(private readonly prisma: PrismaService) {
    // Select storage provider based on env
    if (process.env.UPLOAD_PROVIDER === 's3') {
      this.storage = new S3StorageProvider();
      this.logger.log('Upload service initialized with S3/R2 storage');
    } else {
      this.storage = new LocalStorageProvider();
      this.logger.log('Upload service initialized with LOCAL storage');
    }
  }

  /**
   * Upload a single image for a hotel
   */
  async uploadHotelImage(
    hotelId: string,
    file: Express.Multer.File,
    category: 'HOTEL' | 'ROOM' | 'AMENITY' | 'GALLERY' = 'HOTEL',
    altText?: string,
  ) {
    this.validateFile(file);

    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${randomUUID()}${ext}`;
    const key = `hotels/${hotelId}/${category.toLowerCase()}/${filename}`;

    // Upload original
    const url = await this.storage.upload(file.buffer, key, file.mimetype);

    // Create thumbnail (simple resize for now)
    let thumbnailUrl: string | undefined;
    try {
      // Use sharp if available for thumbnail generation
      const sharp = await import('sharp').catch(() => null);
      if (sharp) {
        const thumbBuffer = await sharp.default(file.buffer)
          .resize(400, 300, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer();
        
        const thumbKey = `hotels/${hotelId}/${category.toLowerCase()}/thumb_${randomUUID()}.webp`;
        thumbnailUrl = await this.storage.upload(thumbBuffer, thumbKey, 'image/webp');
      }
    } catch (err) {
      this.logger.warn('Thumbnail generation skipped (sharp not available)');
    }

    // Get image dimensions if sharp is available
    let width: number | undefined;
    let height: number | undefined;
    try {
      const sharp = await import('sharp').catch(() => null);
      if (sharp) {
        const metadata = await sharp.default(file.buffer).metadata();
        width = metadata.width;
        height = metadata.height;
      }
    } catch {
      // dimensions optional
    }

    // Store in Media table
    const media = await this.prisma.media.create({
      data: {
        hotelId,
        url,
        thumbnailUrl,
        type: 'IMAGE',
        category,
        altText: altText || file.originalname,
        width,
        height,
        sizeBytes: file.size,
      },
    });

    this.logger.log(`Image uploaded for hotel ${hotelId}: ${media.id} (${category})`);

    return {
      id: media.id,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      width: media.width,
      height: media.height,
      sizeBytes: media.sizeBytes,
      category: media.category,
    };
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(
    hotelId: string,
    files: Express.Multer.File[],
    category: 'HOTEL' | 'ROOM' | 'AMENITY' | 'GALLERY' = 'GALLERY',
  ) {
    const results = [];
    for (const file of files) {
      const result = await this.uploadHotelImage(hotelId, file, category);
      results.push(result);
    }
    return results;
  }

  /**
   * Delete an image
   */
  async deleteImage(mediaId: string, hotelId: string) {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, hotelId },
    });

    if (!media) {
      throw new BadRequestException('Image not found');
    }

    // Delete from storage
    const urlPath = new URL(media.url).pathname.replace('/uploads/', '');
    await this.storage.delete(urlPath);

    if (media.thumbnailUrl) {
      try {
        const thumbPath = new URL(media.thumbnailUrl).pathname.replace('/uploads/', '');
        await this.storage.delete(thumbPath);
      } catch {
        // thumbnail deletion optional
      }
    }

    // Delete from database
    await this.prisma.media.delete({ where: { id: mediaId } });

    this.logger.log(`Image deleted: ${mediaId}`);
    return { success: true, message: 'Image deleted' };
  }

  /**
   * Get all media for a hotel
   */
  async getHotelMedia(hotelId: string, category?: string) {
    return this.prisma.media.findMany({
      where: {
        hotelId,
        ...(category ? { category: category as any } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Update sort order of media items
   */
  async updateMediaOrder(mediaIds: string[]) {
    const updates = mediaIds.map((id, index) =>
      this.prisma.media.update({
        where: { id },
        data: { sortOrder: index },
      })
    );
    await this.prisma.$transaction(updates);
    return { success: true };
  }

  private validateFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }
  }
}
