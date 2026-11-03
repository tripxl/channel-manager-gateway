export const PROVIDER_CODES = ["DJUBO", "STAAH", "SITEMINDER", "EZEE"] as const;
export type ProviderCode = (typeof PROVIDER_CODES)[number];
export type ProviderEnvironment = "SANDBOX" | "PRODUCTION";

export interface ProviderContext {
  provider: ProviderCode;
  providerHotelId: string;
  environment: ProviderEnvironment;
  credentialRef?: string;
  requestId: string;
}

export interface GatewayRequest<T> {
  context: ProviderContext;
  data: T;
}
export interface Money {
  amount: string;
  currency: string;
}
export interface Occupancy {
  adults: number;
  childrenAges: number[];
}
export interface ProviderCapabilities {
  availability: boolean;
  rateRecheck: boolean;
  booking: boolean;
  bookingVerification: boolean;
  reservationLookup: boolean;
  cancellation: boolean;
  cancellationQuote: boolean;
  guestCreation: boolean;
  guestUpdate: boolean;
  guestHistory: boolean;
  roomAvailability: boolean;
  roomStatus: boolean;
  checkIn: boolean;
  checkOut: boolean;
  bookingUpdate: boolean;
}
