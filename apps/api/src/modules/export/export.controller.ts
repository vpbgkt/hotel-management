import { Controller, Get, Param, Res, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * REST endpoints for downloading hotel assets.
 * GET /api/export/:hotelId/site.zip      — static HTML site
 * GET /api/export/:hotelId/starter-kit   — Next.js starter kit with API key setup
 */
@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  private assertHotelAccess(req: Request, hotelId: string) {
    const user: any = req.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!user.hotelId || user.hotelId !== hotelId) {
      throw new ForbiddenException('You can only export source code for your own hotel');
    }
  }

  @Get(':hotelId/site.zip')
  async downloadSiteZip(
    @Param('hotelId') hotelId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.assertHotelAccess(req, hotelId);
    const { stream, filename } = await this.exportService.buildSiteZip(hotelId);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    stream.pipe(res);
  }

  @Get(':hotelId/starter-kit')
  async downloadStarterKit(
    @Param('hotelId') hotelId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.assertHotelAccess(req, hotelId);
    const apiUrl = `${req.protocol}://${req.get('host')}`;
    const { stream, filename } = await this.exportService.buildStarterKit(hotelId, apiUrl);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    stream.pipe(res);
  }
}
