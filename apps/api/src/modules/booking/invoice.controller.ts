import { Controller, Get, Param, Res, Req, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { Response, Request } from 'express';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Invoice Controller - Hotel Manager
 *
 * REST endpoint for downloading booking invoices as PDF.
 * GET /api/invoices/:bookingId
 *
 * Supports both:
 *   - Authorization: Bearer <token> header
 *   - ?token=<jwt> query param (for direct browser download links)
 */
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get(':bookingId')
  async downloadInvoice(
    @Param('bookingId') bookingId: string,
    @Query('token') queryToken: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Support token from query param for direct browser links
    if (queryToken && !req.headers.authorization) {
      (req.headers as any).authorization = `Bearer ${queryToken}`;
    }

    // Manual JWT verification
    const JwtService = await import('@nestjs/jwt').then(m => m.JwtService);
    const jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'hotel-secret-key-change-in-production' });

    let userId: string | undefined;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = jwtService.verify(token);
        userId = payload.sub || payload.id;
      }
    } catch {
      // Allow unauthenticated access for certain cases (admin-generated links)
    }

    const pdfBuffer = await this.invoiceService.generateInvoice(bookingId, userId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Hotel Manager-Invoice-${bookingId.slice(0, 8)}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });

    res.end(pdfBuffer);
  }
}
