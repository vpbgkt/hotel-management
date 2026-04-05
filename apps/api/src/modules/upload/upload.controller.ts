/**
 * Upload Controller - Hotel Manager API
 * REST endpoints for file uploads (GraphQL isn't ideal for multipart)
 */

import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import multer from 'multer';
const { memoryStorage } = multer;

const multerOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
};

@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /api/upload/image
   * Upload a single image for a hotel
   * Body: multipart/form-data with 'file' field
   * Query: hotelId, category?, altText?
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('hotelId') hotelId: string,
    @Query('category') category?: string,
    @Query('altText') altText?: string,
  ) {
    if (!hotelId) {
      throw new BadRequestException('hotelId query parameter is required');
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const validCategories = ['HOTEL', 'ROOM', 'AMENITY', 'GALLERY'];
    const cat = (category?.toUpperCase() || 'HOTEL') as 'HOTEL' | 'ROOM' | 'AMENITY' | 'GALLERY';
    if (!validCategories.includes(cat)) {
      throw new BadRequestException(`Invalid category. Allowed: ${validCategories.join(', ')}`);
    }

    this.logger.log(`Upload request: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB) for hotel ${hotelId}`);

    return this.uploadService.uploadHotelImage(hotelId, file, cat, altText);
  }

  /**
   * POST /api/upload/images
   * Upload multiple images for a hotel (max 10)
   * Body: multipart/form-data with 'files' field
   * Query: hotelId, category?
   */
  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('hotelId') hotelId: string,
    @Query('category') category?: string,
  ) {
    if (!hotelId) {
      throw new BadRequestException('hotelId query parameter is required');
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const validCategories = ['HOTEL', 'ROOM', 'AMENITY', 'GALLERY'];
    const cat = (category?.toUpperCase() || 'GALLERY') as 'HOTEL' | 'ROOM' | 'AMENITY' | 'GALLERY';
    if (!validCategories.includes(cat)) {
      throw new BadRequestException(`Invalid category. Allowed: ${validCategories.join(', ')}`);
    }

    this.logger.log(`Batch upload: ${files.length} files for hotel ${hotelId}`);

    return this.uploadService.uploadMultipleImages(hotelId, files, cat);
  }

  /**
   * GET /api/upload/media/:hotelId
   * Get all media for a hotel
   */
  @Get('media/:hotelId')
  async getHotelMedia(
    @Param('hotelId') hotelId: string,
    @Query('category') category?: string,
  ) {
    return this.uploadService.getHotelMedia(hotelId, category);
  }

  /**
   * DELETE /api/upload/media/:mediaId
   * Delete a media item
   */
  @Delete('media/:mediaId')
  async deleteMedia(
    @Param('mediaId') mediaId: string,
    @Query('hotelId') hotelId: string,
  ) {
    if (!hotelId) {
      throw new BadRequestException('hotelId query parameter is required');
    }
    return this.uploadService.deleteImage(mediaId, hotelId);
  }
}
