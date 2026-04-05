/**
 * Sentry Global Exception Filter
 * 
 * Catches all unhandled exceptions in NestJS and reports them to Sentry.
 * Falls through to the default NestJS exception handling after capture.
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    // Only capture non-HTTP or 5xx errors to Sentry
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      Sentry.captureException(exception);
      this.logger.error(
        `Unhandled exception captured by Sentry`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // For GraphQL context, re-throw so Apollo handles it
    const contextType = host.getType<string>();
    if (contextType === 'graphql') {
      throw exception;
    }

    // For HTTP context, send error response
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request?.url,
      message:
        exception instanceof HttpException
          ? exception.message
          : 'Internal server error',
    };

    response?.status?.(status)?.json?.(body);
  }
}
