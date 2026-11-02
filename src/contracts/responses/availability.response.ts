import { Money, ProviderCode } from "../common/provider.types";

export interface AvailabilityPartyRoom {
  roomId: string;
  adults: number;
  childrenAges: number[];
}

export interface AvailabilityRoomPrice {
  baseAmount: string;
  taxAmount: string;
  totalAmount: string;
  baseAmountPerNight?: string;
  taxAmountPerNight?: string;
  taxBreakup?: Record<string, string | number>;
  currency: string;
}

export interface AvailabilityLineItem {
  type: string;
  subType?: string;
  paidAtCheckout?: boolean;
  amount: string;
  amountPerNight?: string;
  currency: string;
}

export interface AvailabilityRateOption {
  providerRatePlanId: string;
  ratePlanName: string;
  availableRooms?: number;
  paymentPolicy?: string;
  bookingUrl?: string;
  pricesByRoomId: Record<string, AvailabilityRoomPrice>;
  lineItems: AvailabilityLineItem[];
  pricingIntegrity: {
    roomIdsMatchParty: boolean;
    baseAmountMatchesLineItems: boolean;
    taxAmountMatchesLineItems: boolean;
  };
  bookable: boolean;
  providerData: ProviderData<{
    bookingToken: unknown;
    tokenScope: "RATE_COMBINATION";
  }>;
}

export interface AvailableRoom {
  providerRoomId: string;
  roomName: string;
  maxOccupancy: unknown;
  rateOptions: AvailabilityRateOption[];
}

export interface AvailabilityResponse {
  provider: ProviderCode;
  providerHotelId: string;
  status: "available" | "unavailable" | "error";
  message: string;
  party: AvailabilityPartyRoom[];
  rooms: AvailableRoom[];
  providerDetails?: unknown;
}

export interface TracedAvailabilityResponse<TRaw = unknown> {
  provider: ProviderCode;
  providerHotelId: string;
  requestId: string;
  mappingVersion: number;
  normalized: AvailabilityResponse;
  rawProviderResponse: TRaw;
}

export interface ProviderData<T = unknown> {
  provider: ProviderCode;
  schemaVersion: number;
  payload: T;
}

export interface RecheckRateResponse {
  available: boolean;
  priceChanged: boolean;
  price?: Money;
  providerData?: ProviderData;
}
