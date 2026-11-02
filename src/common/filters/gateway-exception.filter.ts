import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GatewayExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request & { requestId?: string }>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : {};
    const value = typeof body === 'object' && body !== null ? body as Record<string, unknown> : { message: body };
    const error = status === 500
      ? { code: 'PROVIDER_UNAVAILABLE', message: 'An unexpected gateway error occurred.', retryable: false }
      : { code: value.code ?? this.defaultCode(status), message: value.message ?? 'Request failed', retryable: value.retryable ?? false, ...(value.details === undefined ? {} : { details: value.details }) };
    response.status(status).json({ success: false, error, requestId: request.requestId });
  }
  private defaultCode(status: number) {
    if (status === 400) return 'VALIDATION_FAILED';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    return 'PROVIDER_UNAVAILABLE';
  }
}
