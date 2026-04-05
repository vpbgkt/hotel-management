/**
 * Roles Guard - Hotel Manager API
 *
 * Checks if the authenticated user has the required role(s)
 * to access the resource. Use with @Roles() decorator.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

export const ROLES_KEY = 'roles';

/**
 * Roles decorator — sets required roles on a handler
 * @example @Roles('PLATFORM_ADMIN', 'HOTEL_ADMIN')
 */
export const Roles = (...roles: string[]) =>
  Reflect.metadata(ROLES_KEY, roles) as any;

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required
    }

    // Try GraphQL context first, fall back to HTTP
    let user: any;
    try {
      const ctx = GqlExecutionContext.create(context);
      user = ctx.getContext().req?.user;
    } catch {
      // Not a GraphQL context
    }

    if (!user) {
      const request = context.switchToHttp().getRequest();
      user = request?.user;
    }

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required role(s): ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
