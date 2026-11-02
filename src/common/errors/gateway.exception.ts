import { HttpException, HttpStatus } from '@nestjs/common';

export type GatewayErrorCode = 'VALIDATION_FAILED' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'HOTEL_NOT_FOUND' |
  'OFFER_EXPIRED' | 'PRICE_CHANGED' | 'ROOM_UNAVAILABLE' | 'OPERATION_NOT_SUPPORTED' |
  'PROVIDER_RATE_LIMITED' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_TIMEOUT' |
  'BOOKING_STATUS_UNKNOWN' | 'BOOKING_FAILED' | 'CANCELLATION_NOT_ALLOWED' | 'UNSUPPORTED_PROVIDER';

export class GatewayException extends HttpException {
  constructor(public readonly code: GatewayErrorCode, message: string, status: HttpStatus, public readonly retryable = false, public readonly details?: unknown) {
    super({ code, message, retryable, details }, status);
  }
}

export const unsupportedOperation = (provider: string, operation: string) =>
  new GatewayException('OPERATION_NOT_SUPPORTED', `${operation} is not supported for ${provider}`, HttpStatus.UNPROCESSABLE_ENTITY);
