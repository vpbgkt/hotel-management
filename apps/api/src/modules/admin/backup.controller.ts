/**
 * Backup Controller - Hotel Manager API
 *
 * REST endpoint for database backup/restore.
 * Only accessible by HOTEL_ADMIN role.
 */

import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';

@Controller('backup')
export class BackupController {
  private readonly logger = new Logger(BackupController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('export')
  async exportData(@Req() req: any, @Res() res: Response) {
    const user = req.user;
    if (!user || user.role !== 'HOTEL_ADMIN') {
      throw new ForbiddenException('Only hotel admins can export data');
    }

    const hotelId = user.hotelId;
    if (!hotelId) {
      throw new ForbiddenException('No hotel associated');
    }

    this.logger.log(`Backup export requested by ${user.email}`);

    const [hotel, roomTypes, bookings, reviews, users, media, seoMeta] =
      await Promise.all([
        this.prisma.hotel.findUnique({ where: { id: hotelId } }),
        this.prisma.roomType.findMany({ where: { hotelId } }),
        this.prisma.booking.findMany({
          where: { hotelId },
          include: { guest: { select: { name: true, email: true, phone: true } } },
        }),
        this.prisma.review.findMany({ where: { hotelId } }),
        this.prisma.user.findMany({
          where: { hotelId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        }),
        this.prisma.media.findMany({ where: { hotelId } }),
        this.prisma.sEOMeta.findMany({ where: { hotelId } }),
      ]);

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      hotel,
      roomTypes,
      bookings,
      reviews,
      users,
      galleryImages: media,
      seoMeta,
    };

    const json = JSON.stringify(backup, null, 2);
    const filename = `backup-${hotel?.slug || 'hotel'}-${new Date().toISOString().slice(0, 10)}.json`;

    // Log the backup
    await this.prisma.backupLog.create({
      data: {
        filename,
        sizeBytes: Buffer.byteLength(json, 'utf8'),
        triggeredBy: user.id,
        status: 'completed',
      },
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(json);
  }

  @Get('logs')
  async getBackupLogs(@Req() req: any) {
    const user = req.user;
    if (!user || user.role !== 'HOTEL_ADMIN') {
      throw new ForbiddenException('Only hotel admins can view backup logs');
    }

    return this.prisma.backupLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
