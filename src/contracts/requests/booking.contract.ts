import { Money, Occupancy } from "../common/provider.types";

export interface CreateBookingRequest {
  bookingReference: string;
  providerData: unknown;
  stay: { checkIn: string; checkOut: string; rooms: Occupancy[] };
  guest: { firstName: string; lastName: string; email: string; phone: string };
  expectedPrice: Money;
  specialRequests?: string;
}

export interface VerifyBookingRequest {
  bookingReference: string;
  providerReservationId?: string;
  providerReferenceId?: string;
  providerData?: unknown;
}

export interface ReservationLookupRequest {
  providerReservationId?: string;
  providerReferenceId?: string;
  bookingReference: string;
}
