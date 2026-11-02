import { HttpStatus, Injectable } from "@nestjs/common";
import {
  GatewayException,
  unsupportedOperation,
} from "../common/errors/gateway.exception";
import {
  AvailabilityEnvelopeDto,
  RecheckEnvelopeDto,
} from "../dtos/requests/availability.dto";
import {
  BookingIdentifiersEnvelopeDto,
  CreateBookingEnvelopeDto,
} from "../dtos/requests/booking.dto";
import { CancelEnvelopeDto } from "../dtos/requests/cancellation.dto";
import { ChannelProviderFactory } from "../factory/channel-provider.factory";
import { ProviderOperationEnvelopeDto } from "../dtos/requests/provider-operation.dto";

@Injectable()
export class ChannelManagerService {
  constructor(private readonly providerFactory: ChannelProviderFactory) {}

  checkAvailability(request: AvailabilityEnvelopeDto) {
    this.validateStay(request.data.checkIn, request.data.checkOut);
    return this.providerFactory
      .get(request.context.provider)
      .getAvailability(request.context, request.data);
  }

  recheckRate(request: RecheckEnvelopeDto) {
    this.validateStay(request.data.stay.checkIn, request.data.stay.checkOut);
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.recheckRate)
      throw unsupportedOperation(provider.code, "rate recheck");
    return provider.recheckRate(request.context, request.data);
  }

  createBooking(request: CreateBookingEnvelopeDto) {
    return this.providerFactory
      .get(request.context.provider)
      .createBooking(request.context, request.data);
  }

  verifyBooking(request: BookingIdentifiersEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.verifyBooking)
      throw unsupportedOperation(provider.code, "booking verification");
    return provider.verifyBooking(request.context, request.data);
  }

  getBookingDetails(request: BookingIdentifiersEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.getReservation)
      throw unsupportedOperation(provider.code, "reservation lookup");
    return provider.getReservation(request.context, request.data);
  }

  cancelBooking(request: CancelEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.cancelBooking)
      throw unsupportedOperation(provider.code, "cancellation");
    return provider.cancelBooking(request.context, request.data);
  }

  capabilities() {
    return this.providerFactory.capabilities();
  }

  createGuest(request: ProviderOperationEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.createGuest)
      throw unsupportedOperation(provider.code, "guest creation");
    return provider.createGuest(request.context, request.data);
  }

  updateGuest(request: ProviderOperationEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.updateGuest)
      throw unsupportedOperation(provider.code, "guest update");
    return provider.updateGuest(request.context, request.data);
  }

  getGuestHistory(request: ProviderOperationEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.getGuestHistory)
      throw unsupportedOperation(provider.code, "guest history");
    return provider.getGuestHistory(request.context, request.data);
  }

  submitBooking(request: ProviderOperationEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.submitBooking)
      throw unsupportedOperation(provider.code, "booking submit");
    return provider.submitBooking(request.context, request.data);
  }

  getBookingInformation(request: ProviderOperationEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.getBookingInformation)
      throw unsupportedOperation(provider.code, "booking information");
    return provider.getBookingInformation(request.context, request.data);
  }

  fetchReservation(request: ProviderOperationEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.fetchReservation)
      throw unsupportedOperation(provider.code, "fetch reservation");
    return provider.fetchReservation(request.context, request.data);
  }

  fetchRoomNumbers(request: ProviderOperationEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.fetchRoomNumbers)
      throw unsupportedOperation(provider.code, "fetch room numbers");
    return provider.fetchRoomNumbers(request.context, request.data);
  }

  fetchRoomStatus(request: ProviderOperationEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.fetchRoomStatus)
      throw unsupportedOperation(provider.code, "fetch room status");
    return provider.fetchRoomStatus(request.context, request.data);
  }

  checkIn(request: ProviderOperationEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.checkIn)
      throw unsupportedOperation(provider.code, "check-in");
    return provider.checkIn(request.context, request.data);
  }

  checkOut(request: ProviderOperationEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.checkOut)
      throw unsupportedOperation(provider.code, "check-out");
    return provider.checkOut(request.context, request.data);
  }

  cancelReservation(request: ProviderOperationEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.cancelReservation)
      throw unsupportedOperation(provider.code, "cancellation");
    return provider.cancelReservation(request.context, request.data);
  }

  updateBooking(request: ProviderOperationEnvelopeDto) {
    const provider = this.providerFactory.get(request.context.provider);
    if (!provider.updateBooking)
      throw unsupportedOperation(provider.code, "booking update");
    return provider.updateBooking(request.context, request.data);
  }

  private validateStay(checkIn: string, checkOut: string) {
    if (checkOut <= checkIn)
      throw new GatewayException(
        "VALIDATION_FAILED",
        "checkOut must be after checkIn",
        HttpStatus.BAD_REQUEST,
      );
  }
}
