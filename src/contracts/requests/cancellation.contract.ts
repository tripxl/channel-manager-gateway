export interface CancelBookingRequest { bookingReference: string; providerReservationId?: string; providerReferenceId?: string; reason?: string; providerData?: unknown }
export interface CancellationQuoteRequest { providerReservationId?: string; providerReferenceId?: string; bookingReference: string }
