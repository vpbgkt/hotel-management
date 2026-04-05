/**
 * API Key Guards
 *
 * ApiKeyGuard: Validates x-api-key header via the api-key passport strategy.
 * ApiPermissionGuard: Checks the API key has the required permission(s).
 * CombinedAuthGuard: Accepts either JWT Bearer token OR API key.
 */

import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  CanActivate,
  SetMetadata,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';

// ─── Decorator: @RequireApiPermission('READ_HOTEL', 'READ_ROOMS') ────────

export const API_PERMISSIONS_KEY = 'api_permissions';
export const RequireApiPermission = (...permissions: string[]) =>
  SetMetadata(API_PERMISSIONS_KEY, permissions);

// ─── ApiKeyGuard: passport-based guard for x-api-key header ────────────

@Injectable()
export class ApiKeyGuard extends AuthGuard('api-key') {
  getRequest(context: ExecutionContext) {
    try {
      const ctx = GqlExecutionContext.create(context);
      return ctx.getContext().req;
    } catch {
      return context.switchToHttp().getRequest();
    }
  }
}

// ─── ApiPermissionGuard: checks permissions on the validated key ────────

@Injectable()
export class ApiPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      API_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    let user: any;
    try {
      const ctx = GqlExecutionContext.create(context);
      user = ctx.getContext().req?.user;
    } catch {
      user = context.switchToHttp().getRequest()?.user;
    }

    if (!user?.isApiKey) {
      // JWT users bypass permission checks (they use role-based guards)
      return true;
    }

    const hasPermission = requiredPermissions.every((p) =>
      user.permissions?.includes(p),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `API key missing required permission(s): ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}

// ─── CombinedAuthGuard: accepts JWT OR API key ────────────────────────

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    let req: any;
    try {
      const ctx = GqlExecutionContext.create(context);
      req = ctx.getContext().req;
    } catch {
      req = context.switchToHttp().getRequest();
    }

    // Try JWT first (Authorization: Bearer ...)
    if (req?.headers?.authorization?.startsWith('Bearer ')) {
      const jwtGuard = new (AuthGuard('jwt'))();
      // Patch getRequest for GraphQL context
      jwtGuard.getRequest = (ctx: ExecutionContext) => {
        try {
          return GqlExecutionContext.create(ctx).getContext().req;
        } catch {
          return ctx.switchToHttp().getRequest();
        }
      };
      try {
        const result = await jwtGuard.canActivate(context);
        if (result) return true;
      } catch {
        // JWT failed, try API key below
      }
    }

    // Try API key (x-api-key: ...)
    if (req?.headers?.['x-api-key']) {
      const apiKeyGuard = new ApiKeyGuard();
      try {
        const result = await apiKeyGuard.canActivate(context);
        if (result) return true;
      } catch (err) {
        throw err; // Rethrow API key errors (they're more specific)
      }
    }

    throw new ForbiddenException('Authentication required (JWT or API key)');
  }
}
