import {
  AvailabilityRequest,
  RecheckRateRequest,
} from "../contracts/requests/availability.contract";
import {
  RecheckRateResponse,
  UnifiedAvailabilityResponse,
} from "../contracts/responses/availability.response";
import {
  CreateBookingRequest,
  ReservationLookupRequest,
  VerifyBookingRequest,
} from "../contracts/requests/booking.contract";
import { ProviderBookingResult } from "../contracts/responses/booking.response";
import {
  CancelBookingRequest,
  CancellationQuoteRequest,
} from "../contracts/requests/cancellation.contract";
import {
  CancelBookingResponse,
  CancellationQuoteResponse,
} from "../contracts/responses/cancellation.response";
import {
  ProviderCapabilities,
  ProviderCode,
  ProviderContext,
} from "../contracts/common/provider.types";
import { ProviderOperationData } from "../contracts/requests/provider-operations.contract";
import { ProviderOperationResponse } from "../contracts/responses/provider-operations.response";

export interface ChannelProvider {
  readonly code: ProviderCode;
  readonly capabilities: ProviderCapabilities;
  getAvailability(
    context: ProviderContext,
    request: AvailabilityRequest,
  ): Promise<UnifiedAvailabilityResponse>;
  recheckRate?(
    context: ProviderContext,
    request: RecheckRateRequest,
  ): Promise<RecheckRateResponse>;
  createBooking(
    context: ProviderContext,
    request: CreateBookingRequest,
  ): Promise<ProviderBookingResult>;
  verifyBooking?(
    context: ProviderContext,
    request: VerifyBookingRequest,
  ): Promise<ProviderBookingResult>;
  getReservation?(
    context: ProviderContext,
    request: ReservationLookupRequest,
  ): Promise<ProviderBookingResult>;
  cancelBooking?(
    context: ProviderContext,
    request: CancelBookingRequest,
  ): Promise<CancelBookingResponse>;
  getCancellationQuote?(
    context: ProviderContext,
    request: CancellationQuoteRequest,
  ): Promise<CancellationQuoteResponse>;
  createGuest?(
    context: ProviderContext,
    request: ProviderOperationData,
  ): Promise<ProviderOperationResponse>;
  updateGuest?(
    context: ProviderContext,
    request: ProviderOperationData,
  ): Promise<ProviderOperationResponse>;
  getGuestHistory?(
    context: ProviderContext,
    request: ProviderOperationData,
  ): Promise<ProviderOperationResponse>;
  submitBooking?(
    context: ProviderContext,
    request: ProviderOperationData,
  ): Promise<ProviderOperationResponse>;
  getBookingInformation?(
    context: ProviderContext,
    request: ProviderOperationData,
  ): Promise<ProviderOperationResponse>;
  fetchReservation?(
    context: ProviderContext,
    request: ProviderOperationData,
  ): Promise<ProviderOperationResponse>;
  fetchRoomNumbers?(
    context: ProviderContext,
    request: ProviderOperationData,
  ): Promise<ProviderOperationResponse>;
  fetchRoomStatus?(
    context: ProviderContext,
    request: ProviderOperationData,
  ): Promise<ProviderOperationResponse>;
  checkIn?(
    context: ProviderContext,
    request: ProviderOperationData,
  ): Promise<ProviderOperationResponse>;
  checkOut?(
    context: ProviderContext,
    request: ProviderOperationData,
  ): Promise<ProviderOperationResponse>;
  cancelReservation?(
    context: ProviderContext,
    request: ProviderOperationData,
  ): Promise<ProviderOperationResponse>;
  updateBooking?(
    context: ProviderContext,
    request: ProviderOperationData,
  ): Promise<ProviderOperationResponse>;
}
