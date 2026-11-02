import { Body, Controller, Get, Post, SetMetadata } from "@nestjs/common";
import { RAW_RESPONSE_KEY } from "../common/interceptors/request-id.interceptor";
import {
  AvailabilityEnvelopeDto,
  RecheckEnvelopeDto,
} from "../dtos/requests/availability.dto";
import {
  BookingIdentifiersEnvelopeDto,
  CreateBookingEnvelopeDto,
} from "../dtos/requests/booking.dto";
import { CancelEnvelopeDto } from "../dtos/requests/cancellation.dto";
import { ChannelManagerService } from "../services/channel-manager.service";
import { ProviderOperationEnvelopeDto } from "../dtos/requests/provider-operation.dto";

@Controller("internal/v1")
export class ChannelManagerController {
  constructor(private readonly channelManagerService: ChannelManagerService) {}

  @Post("availability")
  @SetMetadata(RAW_RESPONSE_KEY, true)
  checkAvailability(@Body() request: AvailabilityEnvelopeDto) {
    return this.channelManagerService.checkAvailability(request);
  }

  @Post("rates/recheck")
  recheckRate(@Body() request: RecheckEnvelopeDto) {
    return this.channelManagerService.recheckRate(request);
  }

  @Post("bookings")
  createBooking(@Body() request: CreateBookingEnvelopeDto) {
    return this.channelManagerService.createBooking(request);
  }

  @Post("bookings/verify")
  verifyBooking(@Body() request: BookingIdentifiersEnvelopeDto) {
    return this.channelManagerService.verifyBooking(request);
  }

  @Post("bookings/details")
  getBookingDetails(@Body() request: BookingIdentifiersEnvelopeDto) {
    return this.channelManagerService.getBookingDetails(request);
  }

  @Post("bookings/cancel")
  cancelBooking(@Body() request: CancelEnvelopeDto) {
    return this.channelManagerService.cancelBooking(request);
  }

  @Get("providers/capabilities")
  capabilities() {
    return this.channelManagerService.capabilities();
  }

  @Post("guests")
  createGuest(@Body() request: ProviderOperationEnvelopeDto) {
    return this.channelManagerService.createGuest(request);
  }

  @Post("guests/update")
  updateGuest(@Body() request: ProviderOperationEnvelopeDto) {
    return this.channelManagerService.updateGuest(request);
  }

  @Post("guests/history")
  getGuestHistory(@Body() request: ProviderOperationEnvelopeDto) {
    return this.channelManagerService.getGuestHistory(request);
  }

  @Post("bookings/submit")
  @SetMetadata(RAW_RESPONSE_KEY, true)
  submitBooking(@Body() request: ProviderOperationEnvelopeDto) {
    return this.channelManagerService.submitBooking(request);
  }

  @Post("bookings/information")
  getBookingInformation(@Body() request: ProviderOperationEnvelopeDto) {
    return this.channelManagerService.getBookingInformation(request);
  }

  @Post("reservations/fetch")
  fetchReservation(@Body() request: ProviderOperationEnvelopeDto) {
    return this.channelManagerService.fetchReservation(request);
  }

  @Post("rooms/availability")
  fetchRoomNumbers(@Body() request: ProviderOperationEnvelopeDto) {
    return this.channelManagerService.fetchRoomNumbers(request);
  }

  @Post("rooms/status")
  fetchRoomStatus(@Body() request: ProviderOperationEnvelopeDto) {
    return this.channelManagerService.fetchRoomStatus(request);
  }

  @Post("bookings/check-in")
  checkIn(@Body() request: ProviderOperationEnvelopeDto) {
    return this.channelManagerService.checkIn(request);
  }

  @Post("bookings/check-out")
  checkOut(@Body() request: ProviderOperationEnvelopeDto) {
    return this.channelManagerService.checkOut(request);
  }

  @Post("bookings/cancellation")
  cancelReservation(@Body() request: ProviderOperationEnvelopeDto) {
    return this.channelManagerService.cancelReservation(request);
  }

  @Post("bookings/update")
  updateBooking(@Body() request: ProviderOperationEnvelopeDto) {
    return this.channelManagerService.updateBooking(request);
  }

  @Get("health/live")
  live() {
    return { status: "ok" };
  }

  @Get("health/ready")
  ready() {
    return { status: "ready" };
  }
}
