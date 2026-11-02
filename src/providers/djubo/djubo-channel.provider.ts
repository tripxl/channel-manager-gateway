import { Injectable } from '@nestjs/common';
import { AvailabilityRequest } from '../../contracts/requests/availability.contract';
import { CreateBookingRequest } from '../../contracts/requests/booking.contract';
import { ProviderBookingResult } from '../../contracts/responses/booking.response';
import { ChannelProvider } from '../../interfaces/channel-provider.interface';
import { ProviderCapabilities, ProviderContext } from '../../contracts/common/provider.types';
import { unsupportedOperation } from '../../common/errors/gateway.exception';
import { DjuboMapper } from './mapper/djubo.mapper';
import { DjuboClient } from './client/djubo.client';
import { DjuboOperationMapper } from './mapper/djubo-operation.mapper';
import { ProviderOperationData } from '../../contracts/requests/provider-operations.contract';
import { ProviderOperationResponse } from '../../contracts/responses/provider-operations.response';
import { TracedAvailabilityResponse } from '../../contracts/responses/availability.response';
import { DjuboAvailabilityResponse } from './models/responses/djubo-availability.response';

@Injectable()
export class DjuboChannelProvider implements ChannelProvider {
  readonly code = 'DJUBO' as const;
  readonly capabilities: ProviderCapabilities = { availability: true, rateRecheck: false, booking: true,
    bookingVerification: true, reservationLookup: true, cancellation: true, cancellationQuote: true,
    guestCreation: true, guestUpdate: true, guestHistory: true, roomAvailability: true, roomStatus: true,
    checkIn: true, checkOut: true, bookingUpdate: true };
  constructor(private readonly client: DjuboClient, private readonly mapper: DjuboMapper,
    private readonly operationMapper: DjuboOperationMapper) {}
  async getAvailability(
    context: ProviderContext,
    request: AvailabilityRequest,
  ): Promise<TracedAvailabilityResponse<DjuboAvailabilityResponse>> {
    const rawProviderResponse = await this.client.checkAvailability(
      context,
      this.mapper.availabilityRequest(context, request),
    );
    return {
      provider: this.code,
      providerHotelId: context.providerHotelId,
      requestId: context.requestId,
      mappingVersion: 1,
      normalized: this.mapper.availabilityResponse(context, rawProviderResponse),
      rawProviderResponse,
    };
  }
  async createBooking(_context: ProviderContext, _request: CreateBookingRequest): Promise<ProviderBookingResult> {
    throw unsupportedOperation(this.code, 'booking');
  }

  createGuest(context: ProviderContext, data: ProviderOperationData) { return this.execute('guestCreate', context, this.operationMapper.createGuest(context, data)); }
  updateGuest(context: ProviderContext, data: ProviderOperationData) { return this.execute('guestUpdate', context, this.operationMapper.updateGuest(context, data)); }
  getGuestHistory(context: ProviderContext, data: ProviderOperationData) { return this.execute('guestHistory', context, this.operationMapper.guestHistory(context, data), true); }
  submitBooking(context: ProviderContext, data: ProviderOperationData) {
    return this.executeRaw('booking', context, this.operationMapper.bookingSubmit(context, data));
  }
  getBookingInformation(context: ProviderContext, data: ProviderOperationData) { return this.execute('bookingInformation', context, this.operationMapper.bookingInformation(context, data), true); }
  fetchReservation(context: ProviderContext, data: ProviderOperationData) { return this.execute('reservation', context, this.operationMapper.fetchReservation(context, data), true); }
  fetchRoomNumbers(context: ProviderContext, data: ProviderOperationData) { return this.execute('roomAvailability', context, this.operationMapper.roomAvailability(context, data), true); }
  fetchRoomStatus(context: ProviderContext, data: ProviderOperationData) { return this.execute('roomStatus', context, this.operationMapper.roomStatus(context, data), true); }
  checkIn(context: ProviderContext, data: ProviderOperationData) { return this.execute('checkIn', context, this.operationMapper.checkIn(context, data)); }
  checkOut(context: ProviderContext, data: ProviderOperationData) { return this.execute('checkOut', context, this.operationMapper.checkOut(context, data)); }
  cancelReservation(context: ProviderContext, data: ProviderOperationData) { return this.execute('cancellation', context, this.operationMapper.cancellation(context, data)); }
  updateBooking(context: ProviderContext, data: ProviderOperationData) { return this.execute('bookingUpdate', context, this.operationMapper.bookingUpdate(context, data)); }

  private async execute(operation: Parameters<DjuboClient['request']>[0], context: ProviderContext,
    payload: unknown, safeToRetry = false): Promise<ProviderOperationResponse> {
    const raw = await this.client.request(operation, context, payload, safeToRetry);
    return this.operationMapper.response(raw);
  }

  private async executeRaw(
    operation: Parameters<DjuboClient['request']>[0],
    context: ProviderContext,
    payload: unknown,
  ): Promise<ProviderOperationResponse> {
    return this.client.request<ProviderOperationResponse>(operation, context, payload, false);
  }
}
