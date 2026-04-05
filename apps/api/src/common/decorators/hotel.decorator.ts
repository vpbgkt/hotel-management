/**
 * @CurrentHotel() decorator - Hotel Manager API
 *
 * Extracts the current hotel ID from the request context.
 * Works for both REST and GraphQL endpoints.
 *
 * Usage:
 *   @CurrentHotel() hotelId: string
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Get the current hotel ID from the request headers (set by middleware)
 * For REST controllers
 */
export const CurrentHotel = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers?.['x-hotel-id'] || null;
  },
);

/**
 * Get the current hotel ID from GraphQL context
 * For GraphQL resolvers
 */
export const GqlCurrentHotel = createParamDecorator(
  (data: unknown, context: ExecutionContext): string | null => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().hotelId || ctx.getContext().req?.headers?.['x-hotel-id'] || null;
  },
);

/**
 * Get the current tenant type (aggregator or hotel)
 */
export const CurrentTenantType = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers?.['x-tenant-type'] || 'aggregator';
  },
);

/**
 * GraphQL version of tenant type decorator
 */
export const GqlCurrentTenantType = createParamDecorator(
  (data: unknown, context: ExecutionContext): string => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().tenantType || 'aggregator';
  },
);
