import { Money } from '../common/provider.types';
export interface CancelBookingResponse { status: 'CANCELLED' | 'REJECTED' | 'UNKNOWN'; cancellationReference?: string; cancellationCharge?: Money; providerStatus?: string }
export interface CancellationQuoteResponse { allowed: boolean; charge?: Money; expiresAt?: string; policyText?: string }
