/**
 * Tenant Guard - Hotel Manager API (Standalone Mode)
 *
 * Ensures hotel admin/staff can only access data for their own hotel.
 * In standalone mode, the hotel ID comes from the HOTEL_ID env var.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class TenantGuard implements CanActivate {
  private extractRequestHotelId(req: any): string | null {
    const headerHotelId = req?.headers?.['x-hotel-id'];
    if (headerHotelId && typeof headerHotelId === 'string') {
      return headerHotelId;
    }

    const queryHotelId = req?.query?.hotelId;
    if (queryHotelId && typeof queryHotelId === 'string') {
      return queryHotelId;
    }

    const bodyHotelId = req?.body?.hotelId;
    if (bodyHotelId && typeof bodyHotelId === 'string') {
      return bodyHotelId;
    }

    const variableHotelId = req?.body?.variables?.hotelId;
    if (variableHotelId && typeof variableHotelId === 'string') {
      return variableHotelId;
    }

    const nestedInputHotelId = req?.body?.variables?.input?.hotelId;
    if (nestedInputHotelId && typeof nestedInputHotelId === 'string') {
      return nestedInputHotelId;
    }

    return null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let req: any;

    // Try GraphQL context first
    try {
      const ctx = GqlExecutionContext.create(context);
      req = ctx.getContext().req;
    } catch {
      req = context.switchToHttp().getRequest();
    }

    const user = req?.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Guests can access their own data (handled by business logic)
    if (user.role === 'GUEST') {
      return true;
    }

    // Hotel admin/staff must have a hotelId assigned
    if (!user.hotelId) {
      throw new ForbiddenException('User is not associated with any hotel');
    }

    // Check if hotelId in the request matches the user's hotel
    const requestHotelId = this.extractRequestHotelId(req);
    if (requestHotelId && requestHotelId !== user.hotelId) {
      throw new ForbiddenException(
        'You can only access data for your own hotel',
      );
    }

    return true;
  }
}
