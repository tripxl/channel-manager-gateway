import { Money } from "../common/provider.types";
export type ProviderBookingStatus =
  "CONFIRMED" | "REJECTED" | "UNKNOWN" | "CANCELLED";
export interface ProviderBookingResult {
  status: ProviderBookingStatus;
  providerReservationId?: string;
  confirmationNumber?: string;
  providerReferenceId?: string;
  totalPrice?: Money;
  providerStatus?: string;
}
