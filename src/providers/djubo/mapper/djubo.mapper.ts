import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProviderContext } from "../../../contracts/common/provider.types";
import { AvailabilityRequest } from "../../../contracts/requests/availability.contract";
import { CreateBookingRequest } from "../../../contracts/requests/booking.contract";
import {
  AvailabilityLineItem,
  AvailabilityPartyRoom,
  AvailabilityRateOption,
  AvailabilityResponse,
  AvailabilityRoomPrice,
  AvailableRoom,
} from "../../../contracts/responses/availability.response";
import { ProviderBookingResult } from "../../../contracts/responses/booking.response";
import { DjuboAvailabilityRequest } from "../models/requests/djubo-availability.request";
import { DjuboAvailabilityResponse } from "../models/responses/djubo-availability.response";

@Injectable()
export class DjuboMapper {
  constructor(private readonly config: ConfigService) {}

  availabilityRequest(
    context: ProviderContext,
    request: AvailabilityRequest,
  ): DjuboAvailabilityRequest {
    return {
      api_version: Number(this.config.get("DJUBO_API_VERSION", 9)),
      source_id: Number(this.config.get("DJUBO_SOURCE_ID", 105)),
      sub_source_id: Number(this.config.get("DJUBO_SUB_SOURCE_ID", 110)),
      start_date: request.checkIn,
      end_date: request.checkOut,
      multiple_category_allowed: true,
      party: request.rooms.map((room) => ({
        adults: room.adults,
        children: room.childrenAges,
      })),
      language: this.config.get("DJUBO_LANGUAGE", "en_US"),
      query_key: this.config.get<string>("DJUBO_QUERY_KEY") || "",
      currency:
        request.currency ||
        this.config.get<string>("DJUBO_DEFAULT_CURRENCY") ||
        "INR",
      user_country: this.config.get("DJUBO_USER_COUNTRY", "INDIA"),
      device_type: this.config.get("DJUBO_DEVICE_TYPE", "Desktop"),
      availability_id: this.config.get<string>("DJUBO_AVAILABILITY_ID") || "",
      requested_payload: {
        categories: {
          room_type_details: true,
          rate_plan_details: true,
          room_rate_details: true,
          hotel_details: true,
        },
        category_modifiers: {
          partner_booking_data: true,
          real_time_pricing: true,
          multiple_room_rates: true,
          photos: true,
          text: true,
        },
      },
      hotels: [{ partner_hotel_code: context.providerHotelId }],
    };
  }

  availabilityResponse(
    context: ProviderContext,
    raw: DjuboAvailabilityResponse,
  ): AvailabilityResponse {
    const body = this.record(raw);
    const availabilityRequest = this.record(body.availability_request);
    const party = this.mapParty(
      availabilityRequest.party ?? body.party_information,
    );
    const hotel = this.record(
      this.record(body.hotels)[context.providerHotelId],
    );
    const responseType = String(hotel.response_type ?? "error");
    const status =
      responseType === "available"
        ? "available"
        : responseType === "unavailable"
          ? "unavailable"
          : "error";
    const message =
      status === "available"
        ? `Data fetched successfully from Djubo for partnerCode: ${context.providerHotelId}.`
        : status === "unavailable"
          ? `Data is unavailable from Djubo for partnerCode: ${context.providerHotelId}.`
          : "Invalid response from Djubo: missing or unexpected hotel data";

    if (status !== "available")
      return {
        provider: "DJUBO",
        providerHotelId: context.providerHotelId,
        status,
        message,
        party,
        rooms: [],
      };

    const available = this.record(hotel.available);
    const roomTypes = this.record(available.room_types);
    const ratePlans = this.record(available.rate_plans);
    const partnerDetails = available.partner_booking_details ?? null;
    const partyRoomIds = party.map((room) => room.roomId).sort();
    const rates = Object.values(this.record(available.room_rates)).map(
      (value) => this.record(value),
    );
    const rooms: AvailableRoom[] = Object.entries(roomTypes).map(
      ([categoryId, rawRoom]) => {
        const room = this.record(rawRoom);
        const categoryRates = rates
          .filter((rate) => String(rate.room_type_key ?? "") === categoryId)
          .map((rate) => this.mapRate(rate, ratePlans, partyRoomIds));
        this.sortRates(categoryRates);
        return {
          providerRoomId: categoryId,
          roomName: String(room.name ?? ""),
          maxOccupancy: room.max_occupancy ?? null,
          rateOptions: categoryRates,
        };
      },
    );
    return {
      provider: "DJUBO",
      providerHotelId: context.providerHotelId,
      status,
      message,
      party,
      rooms,
      providerDetails: partnerDetails,
    };
  }

  bookingRequest(context: ProviderContext, request: CreateBookingRequest) {
    const payload = this.record(this.record(request.providerData).payload);
    return {
      api_version: 9,
      partner_hotel_code: context.providerHotelId,
      booking_reference: request.bookingReference,
      partner_data: payload.partnerData,
      stay: request.stay,
      guest: request.guest,
      expected_price: request.expectedPrice,
      special_requests: request.specialRequests,
    };
  }

  bookingResult(raw: unknown): ProviderBookingResult {
    const value = this.record(raw);
    const status = String(
      value.status ?? value.booking_status ?? "",
    ).toUpperCase();
    return {
      status:
        status === "CONFIRMED" || status === "SUCCESS"
          ? "CONFIRMED"
          : status === "CANCELLED"
            ? "CANCELLED"
            : status === "REJECTED" || status === "FAILED"
              ? "REJECTED"
              : "UNKNOWN",
      providerReservationId: this.string(
        value.reservation_id ?? value.booking_id,
      ),
      confirmationNumber: this.string(value.confirmation_number),
      providerReferenceId: this.string(value.reference_id),
      totalPrice: this.money(value.total_price),
      providerStatus: this.string(value.status ?? value.booking_status),
    };
  }

  private mapRate(
    rate: Record<string, any>,
    ratePlans: Record<string, unknown>,
    partyRoomIds: string[],
  ): AvailabilityRateOption {
    const planId = String(rate.rate_plan_key ?? "");
    const plan = this.record(ratePlans[planId]);
    const pricesByRoomId = this.mapPrices(
      this.record(rate.price_per_room),
      this.lineItemCurrency(rate.line_items),
    );
    const lineItems = this.mapLineItems(rate.line_items);
    const priceBaseTotal = this.sumDecimals(
      Object.values(pricesByRoomId).map((price) => price.baseAmount),
    );
    const priceTaxTotal = this.sumDecimals(
      Object.values(pricesByRoomId).map((price) => price.taxAmount),
    );
    const lineBaseTotal = this.sumDecimals(
      lineItems
        .filter((item) => item.type === "rate")
        .map((item) => item.amount),
    );
    const lineTaxTotal = this.sumDecimals(
      lineItems
        .filter((item) => item.type === "tax")
        .map((item) => item.amount),
    );
    const priceRoomIds = Object.keys(pricesByRoomId).sort();
    const roomIdsMatchParty =
      JSON.stringify(priceRoomIds) === JSON.stringify(partyRoomIds);
    const bookingToken = rate.partner_data;
    const hasBookingToken =
      typeof bookingToken === "string" && bookingToken.trim().length > 0;
    return {
      providerRatePlanId: planId,
      ratePlanName: String(
        plan.meal_plan_description_name ?? plan.name ?? planId,
      ),
      ...(typeof rate.rooms_remaining === "number"
        ? { availableRooms: rate.rooms_remaining }
        : {}),
      ...(rate.payment_policy === undefined
        ? {}
        : { paymentPolicy: String(rate.payment_policy) }),
      ...(rate.url === undefined ? {} : { bookingUrl: String(rate.url) }),
      pricesByRoomId,
      lineItems,
      pricingIntegrity: {
        roomIdsMatchParty,
        baseAmountMatchesLineItems: priceBaseTotal === lineBaseTotal,
        taxAmountMatchesLineItems: priceTaxTotal === lineTaxTotal,
      },
      bookable: roomIdsMatchParty && hasBookingToken,
      providerData: {
        provider: "DJUBO",
        schemaVersion: 1,
        payload: { bookingToken, tokenScope: "RATE_COMBINATION" },
      },
    };
  }

  private mapParty(value: unknown): AvailabilityPartyRoom[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) => {
      const room = this.record(item);
      return {
        adults: Number(room.adults ?? 0),
        roomId: String(room.room_id ?? ""),
        childrenAges: this.children(room.children ?? room.childrenAges),
      };
    });
  }

  private sortRates(rates: AvailabilityRateOption[]) {
    const order: Record<string, number> = {
      "Room Only": 1,
      Breakfast: 2,
      "Breakfast and Lunch/Dinner": 3,
      "Breakfast,Lunch and Dinner": 4,
    };
    rates.sort(
      (left, right) =>
        (order[left.ratePlanName.trim()] ?? 999) -
          (order[right.ratePlanName.trim()] ?? 999) ||
        left.ratePlanName.localeCompare(right.ratePlanName),
    );
  }

  private mapPrices(
    prices: Record<string, unknown>,
    fallbackCurrency: string,
  ): Record<string, AvailabilityRoomPrice> {
    return Object.fromEntries(
      Object.entries(prices).map(([roomId, rawPrice]) => {
        const price = this.record(rawPrice);
        const baseAmount = this.decimal(price.totalPrice);
        const taxAmount = this.decimal(price.totalTax);
        return [
          roomId,
          {
            baseAmount,
            taxAmount,
            totalAmount: this.sumDecimals([baseAmount, taxAmount]),
            ...(price.totalPricePerNight === undefined
              ? {}
              : { baseAmountPerNight: this.decimal(price.totalPricePerNight) }),
            ...(price.totalTaxPerNight === undefined
              ? {}
              : { taxAmountPerNight: this.decimal(price.totalTaxPerNight) }),
            ...(price.tax_break_up_dict === undefined
              ? {}
              : { taxBreakup: this.record(price.tax_break_up_dict) }),
            currency: String(price.currency ?? fallbackCurrency),
          },
        ];
      }),
    );
  }

  private mapLineItems(value: unknown): AvailabilityLineItem[] {
    if (!Array.isArray(value)) return [];
    return value.map((rawItem) => {
      const item = this.record(rawItem);
      const price = this.record(
        this.record(item.price).currency_of_charge_price,
      );
      return {
        type: String(item.type ?? ""),
        ...(item.sub_type === undefined
          ? {}
          : { subType: String(item.sub_type) }),
        ...(item.paid_at_checkout === undefined
          ? {}
          : { paidAtCheckout: Boolean(item.paid_at_checkout) }),
        amount: this.decimal(price.amount),
        ...(price.amount_per_night === undefined
          ? {}
          : { amountPerNight: this.decimal(price.amount_per_night) }),
        currency: String(price.currency ?? ""),
      };
    });
  }

  private lineItemCurrency(value: unknown): string {
    if (!Array.isArray(value)) return "";
    for (const rawItem of value) {
      const currency = this.record(
        this.record(this.record(rawItem).price).currency_of_charge_price,
      ).currency;
      if (currency !== undefined) return String(currency);
    }
    return "";
  }

  private children(value: unknown): number[] {
    return Array.isArray(value) ? value.map((age) => Number(age)) : [];
  }

  private decimal(value: unknown): string {
    const result = value === undefined || value === null ? "0" : String(value);
    if (!/^\d+(\.\d+)?$/.test(result))
      throw new Error("Invalid DJUBO money value");
    return result;
  }

  private sumDecimals(values: string[]): string {
    const scale = values.reduce(
      (maximum, value) => Math.max(maximum, value.split(".")[1]?.length ?? 0),
      0,
    );
    const total = values.reduce((sum, value) => {
      const [whole, fraction = ""] = value.split(".");
      return sum + BigInt(`${whole}${fraction.padEnd(scale, "0")}`);
    }, 0n);
    const digits = total.toString().padStart(scale + 1, "0");
    if (!scale) return digits;
    const fraction = digits.slice(-scale).replace(/0+$/, "");
    const whole = digits.slice(0, -scale);
    return fraction ? `${whole}.${fraction}` : whole;
  }

  private record(value: unknown): Record<string, any> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private string(value: unknown): string | undefined {
    return value === undefined || value === null ? undefined : String(value);
  }

  private money(value: unknown) {
    const record = this.record(value);
    return record.amount === undefined
      ? undefined
      : {
          amount: String(record.amount),
          currency: String(record.currency ?? ""),
        };
  }
}
