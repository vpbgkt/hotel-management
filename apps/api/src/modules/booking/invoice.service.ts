import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';

/**
 * Invoice Service - Hotel Manager
 *
 * Generates professional PDF invoices for completed bookings.
 * Uses PDFKit to produce clean, printable invoices with:
 *   - Hotel branding + contact info
 *   - Guest details
 *   - Booking breakdown (room, dates, extras)
 *   - Tax details (CGST/SGST for Indian compliance)
 *   - Payment status & method
 */
@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a PDF invoice for a booking
   *
   * @param bookingId - The booking UUID
   * @param userId - The requesting user (guest or admin)
   * @returns Buffer containing the PDF
   */
  async generateInvoice(bookingId: string, userId?: string): Promise<Buffer> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hotel: true,
        guest: {
          select: { id: true, name: true, email: true, phone: true },
        },
        roomType: {
          select: { name: true, slug: true },
        },
        payments: {
          where: { status: { in: ['CAPTURED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    // Authorization: guest can only download own invoice
    if (userId && (booking as any).guest?.id !== userId) {
      // Check if user is hotel admin or platform admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, hotelId: true },
      });

      if (!user) throw new ForbiddenException();

      const isHotelAdmin = user.role === 'HOTEL_ADMIN' && user.hotelId === booking.hotelId;

      if (!isHotelAdmin) {
        throw new ForbiddenException('You can only download invoices for your own bookings');
      }
    }

    return this.buildPDF(booking);
  }

  private buildPDF(booking: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice - ${booking.bookingNumber}`,
          Author: 'Hotel Manager',
          Subject: `Booking Invoice ${booking.bookingNumber}`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const hotel = booking.hotel;
      const payment = booking.payments?.[0];
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // === HEADER ===
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#1e40af')
        .text(hotel.name, { align: 'left' });
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
        .text(hotel.address, { align: 'left' })
        .text(`${hotel.city}, ${hotel.state} - ${hotel.pincode}`, { align: 'left' })
        .text(`Phone: ${hotel.phone} | Email: ${hotel.email}`, { align: 'left' });

      if (hotel.gstNumber) {
        doc.text(`GST: ${hotel.gstNumber}`, { align: 'left' });
      }

      doc.moveDown(0.5);

      // INVOICE title on right
      const invoiceY = doc.page.margins.top;
      doc.fontSize(28).font('Helvetica-Bold').fillColor('#1e40af')
        .text('INVOICE', doc.page.width - 200, invoiceY, { width: 150, align: 'right' });

      doc.fontSize(9).font('Helvetica').fillColor('#374151')
        .text(`#${booking.bookingNumber}`, doc.page.width - 200, invoiceY + 35, { width: 150, align: 'right' })
        .text(`Date: ${new Date(booking.createdAt).toLocaleDateString('en-IN')}`, doc.page.width - 200, invoiceY + 48, { width: 150, align: 'right' });

      // Status badge
      const statusColor = booking.paymentStatus === 'PAID' ? '#16a34a' : '#eab308';
      doc.fontSize(10).font('Helvetica-Bold').fillColor(statusColor)
        .text(booking.paymentStatus, doc.page.width - 200, invoiceY + 65, { width: 150, align: 'right' });

      // === DIVIDER ===
      const dividerY = Math.max(doc.y, invoiceY + 85) + 10;
      doc.moveTo(50, dividerY).lineTo(50 + pageWidth, dividerY).strokeColor('#e5e7eb').lineWidth(1).stroke();

      doc.y = dividerY + 15;

      // === GUEST DETAILS ===
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e40af')
        .text('BILL TO', 50);
      doc.fontSize(10).font('Helvetica').fillColor('#374151')
        .text(booking.guestName)
        .text(booking.guestEmail)
        .text(booking.guestPhone || '');

      doc.moveDown(1);

      // === BOOKING DETAILS ===
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e40af')
        .text('BOOKING DETAILS', 50);
      doc.moveDown(0.3);

      const detailsData = [
        ['Booking Number', booking.bookingNumber],
        ['Room Type', booking.roomType?.name || 'N/A'],
        ['Booking Type', booking.bookingType],
        ['Check-in', new Date(booking.checkInDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
      ];

      if (booking.checkOutDate) {
        detailsData.push(['Check-out', new Date(booking.checkOutDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })]);
      }
      if (booking.numHours) {
        detailsData.push(['Duration', `${booking.numHours} hours`]);
      }

      detailsData.push(
        ['Rooms', `${booking.numRooms}`],
        ['Guests', `${booking.numGuests}${booking.numExtraGuests > 0 ? ` (+${booking.numExtraGuests} extra)` : ''}`],
      );

      if (booking.specialRequests) {
        detailsData.push(['Special Requests', booking.specialRequests]);
      }

      for (const [label, value] of detailsData) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text(label, 50, doc.y, { continued: true, width: 150 });
        doc.font('Helvetica').fillColor('#374151').text(`  ${value}`, { width: pageWidth - 150 });
      }

      doc.moveDown(1);

      // === CHARGES TABLE ===
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 350;
      const col3 = 450;

      // Table header
      doc.rect(col1, tableTop, pageWidth, 22).fill('#1e40af');
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
        .text('Description', col1 + 8, tableTop + 6, { width: 280 })
        .text('Qty', col2, tableTop + 6, { width: 80, align: 'center' })
        .text('Amount (₹)', col3, tableTop + 6, { width: pageWidth - col3 + 50, align: 'right' });

      let rowY = tableTop + 28;
      const rows: Array<{ desc: string; qty: string; amt: string }> = [];

      // Calculate nights
      const nights = booking.checkOutDate
        ? Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000)
        : 1;

      rows.push({
        desc: `${booking.roomType?.name || 'Room'} - ${booking.bookingType === 'HOURLY' ? `${booking.numHours}hr` : `${nights} Night${nights > 1 ? 's' : ''}`}`,
        qty: `${booking.numRooms}`,
        amt: booking.roomTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      });

      if (booking.extraGuestTotal > 0) {
        rows.push({
          desc: `Extra Guest Charges (${booking.numExtraGuests} guests)`,
          qty: '-',
          amt: booking.extraGuestTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        });
      }

      if (booking.discountAmount > 0) {
        rows.push({
          desc: 'Discount',
          qty: '-',
          amt: `-${booking.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        });
      }

      // Draw rows
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (i % 2 === 0) {
          doc.rect(col1, rowY - 4, pageWidth, 20).fill('#f9fafb');
        }
        doc.fontSize(9).font('Helvetica').fillColor('#374151')
          .text(row.desc, col1 + 8, rowY, { width: 280 })
          .text(row.qty, col2, rowY, { width: 80, align: 'center' })
          .text(`₹${row.amt}`, col3, rowY, { width: pageWidth - col3 + 50, align: 'right' });
        rowY += 20;
      }

      // Subtotal
      rowY += 5;
      doc.moveTo(col3, rowY).lineTo(50 + pageWidth, rowY).strokeColor('#e5e7eb').stroke();
      rowY += 8;

      const subtotal = booking.roomTotal + booking.extraGuestTotal - booking.discountAmount;
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
        .text('Subtotal', col1 + 8, rowY, { width: 280 })
        .text(`₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col3, rowY, { width: pageWidth - col3 + 50, align: 'right' });
      rowY += 18;

      // Tax breakdown (assuming GST: 50% CGST + 50% SGST)
      if (booking.taxes > 0) {
        const halfTax = booking.taxes / 2;
        doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
          .text('CGST (6%)', col1 + 8, rowY, { width: 280 })
          .text(`₹${halfTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col3, rowY, { width: pageWidth - col3 + 50, align: 'right' });
        rowY += 16;
        doc.text('SGST (6%)', col1 + 8, rowY, { width: 280 })
          .text(`₹${halfTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col3, rowY, { width: pageWidth - col3 + 50, align: 'right' });
        rowY += 16;
      }

      // Total
      rowY += 2;
      doc.rect(col1, rowY - 2, pageWidth, 24).fill('#1e40af');
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff')
        .text('TOTAL', col1 + 8, rowY + 4, { width: 280 })
        .text(`₹${booking.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col3, rowY + 4, { width: pageWidth - col3 + 50, align: 'right' });

      rowY += 35;
      doc.y = rowY;

      // === PAYMENT INFO ===
      if (payment) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e40af')
          .text('PAYMENT INFORMATION', 50);
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica').fillColor('#374151')
          .text(`Gateway: ${payment.gateway}`)
          .text(`Transaction ID: ${payment.gatewayPaymentId || 'N/A'}`)
          .text(`Amount Paid: ₹${payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
          .text(`Currency: ${payment.currency}`)
          .text(`Date: ${new Date(payment.createdAt).toLocaleDateString('en-IN')}`);
      }

      doc.moveDown(2);

      // === FOOTER ===
      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor('#e5e7eb').stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
        .text('Thank you for choosing ' + hotel.name + '!', { align: 'center' })
        .text('This is a computer-generated invoice and does not require a signature.', { align: 'center' })
        .text(`Powered by Hotel Manager | Generated on ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });

      doc.end();
    });
  }
}
