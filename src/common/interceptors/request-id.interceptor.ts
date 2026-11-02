import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { map, Observable } from 'rxjs';

export const RAW_RESPONSE_KEY = 'gateway:raw-response';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { requestId?: string }>();
    const response = context.switchToHttp().getResponse<Response>();
    const bodyRequestId = (request.body as { context?: { requestId?: string } } | undefined)?.context?.requestId;
    request.requestId = bodyRequestId || this.safeHeader(request.header('x-request-id')) || randomUUID();
    response.setHeader('x-request-id', request.requestId);
    const rawResponse = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (rawResponse) return next.handle();
    return next.handle().pipe(map(data => ({ success: true, data, requestId: request.requestId })));
  }
  private safeHeader(value?: string) { return value?.slice(0, 128).replace(/[^A-Za-z0-9._:-]/g, ''); }
}
