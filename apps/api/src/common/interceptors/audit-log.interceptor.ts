import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * Audit Log Interceptor
 * 
 * Logs all GraphQL mutations to the database and console.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = GqlExecutionContext.create(context);
    const info = ctx.getInfo();

    // Only audit mutations (not queries)
    if (info?.parentType?.name !== 'Mutation') {
      return next.handle();
    }

    const req = ctx.getContext()?.req;
    const user = req?.user;
    const operationName = info?.fieldName || 'unknown';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const entry = {
            operation: operationName,
            userId: user?.id || null,
            userEmail: user?.email || null,
            userRole: user?.role || null,
            hotelId: user?.hotelId || null,
            ip: req?.ip || req?.connection?.remoteAddress || null,
            duration,
            success: true,
          };
          this.logger.log(JSON.stringify({ ...entry, timestamp: new Date().toISOString() }));
          this.prisma.auditLog.create({ data: entry }).catch(() => {});
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const entry = {
            operation: operationName,
            userId: user?.id || null,
            userEmail: user?.email || null,
            userRole: user?.role || null,
            hotelId: user?.hotelId || null,
            ip: req?.ip || req?.connection?.remoteAddress || null,
            duration,
            success: false,
            errorMessage: error?.message ? error.message.slice(0, 500) : null,
          };
          this.logger.warn(JSON.stringify({ ...entry, timestamp: new Date().toISOString() }));
          this.prisma.auditLog.create({ data: entry }).catch(() => {});
        },
      }),
    );
  }
}
