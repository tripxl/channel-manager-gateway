import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProviderContext } from "../../../contracts/common/provider.types";
import { ProviderOperationData } from "../../../contracts/requests/provider-operations.contract";
import { ProviderOperationResponse } from "../../../contracts/responses/provider-operations.response";
import { GatewayException } from "../../../common/errors/gateway.exception";
import { HttpStatus } from "@nestjs/common";

@Injectable()
export class DjuboOperationMapper {
  constructor(private readonly config: ConfigService) {}

  createGuest(context: ProviderContext, data: ProviderOperationData) {
    this.require(data, ["firstName"]);
    this.requireOne(data, ["phone", "email"]);
    return {
      ...this.base(context),
      ...data,
      guestTrackerId: data.guestTrackerId ?? -1,
    };
  }

  updateGuest(context: ProviderContext, data: ProviderOperationData) {
    this.require(data, ["guestTrackerId", "firstName"]);
    this.requireOne(data, ["phone", "email"]);
    const { guestTrackerId, guestToBeDeleted, ...rest } = data;
    return {
      ...this.base(context),
      ...rest,
      guest_tracker_id: guestTrackerId,
      guest_to_be_deleted: guestToBeDeleted ?? false,
    };
  }

  guestHistory(context: ProviderContext, data: ProviderOperationData) {
    this.require(data, ["guestTrackerId"]);
    return {
      api_version: this.apiVersion,
      source_id: this.sourceId,
      sub_source_id: this.subSourceId,
      guest_tracker_id: data.guestTrackerId,
      partner_hotel_codes: data.partnerHotelCodes ?? [context.providerHotelId],
    };
  }

  bookingSubmit(context: ProviderContext, data: ProviderOperationData) {
    this.require(data, [
      "startDate",
      "endDate",
      "referenceId",
      "customer",
      "rooms",
      "finalPriceAtBooking",
      "finalPriceAtCheckout",
    ]);
    this.validateStay(data.startDate, data.endDate);
    this.validateBookingRooms(data.rooms);
    const payAtCheckoutOnly = this.validatePaymentMode(
      data.payments,
      data.paymentMethod,
      data.finalPriceAtBooking,
      data.finalPriceAtCheckout,
    );
    if (!payAtCheckoutOnly)
      this.requireObjectFields(
        data.payments,
        ["pgTransactionId", "pgReferenceId", "amount", "payeeInfo"],
        "payments",
      );
    const partnerData = this.resolvePartnerData(data);
    this.validateBookingRoomTokens(data.rooms, partnerData);
    this.validateRoomSelectionTotal(
      data.roomSelections,
      data.finalPriceAtBooking,
      data.finalPriceAtCheckout,
    );
    const payload: Record<string, unknown> = {
      ...this.base(context),
      start_date: data.startDate,
      end_date: data.endDate,
      reference_id: data.referenceId,
      multiple_category_allowed: true,
      customer: this.snakeCaseDeep(data.customer),
      rooms: this.snakeCaseDeep(data.rooms),
      final_price_at_booking: this.snakeCaseDeep(data.finalPriceAtBooking),
      final_price_at_checkout: this.snakeCaseDeep(data.finalPriceAtCheckout),
      partner_data: partnerData,
    };

    if (!payAtCheckoutOnly)
      this.assignWhenDefined(
        payload,
        "payments",
        this.snakeCaseDeep(data.payments),
      );

    this.assignWhenDefined(payload, "ip_address", data.ipAddress);
    this.assignWhenDefined(
      payload,
      "customer_list",
      this.snakeCaseDeep(data.customerList),
    );
    this.assignWhenDefined(payload, "addOns", this.snakeCaseDeep(data.addOns));
    this.assignWhenDefined(
      payload,
      "promo_details",
      this.snakeCaseDeep(data.promoDetails),
    );
    this.assignWhenDefined(payload, "special_requests", data.specialRequests);
    if (!payAtCheckoutOnly)
      this.assignWhenDefined(
        payload,
        "payment_method",
        this.snakeCaseDeep(data.paymentMethod),
      );
    this.assignWhenDefined(payload, "partner_room_data", data.partnerRoomData);

    return payload;
  }

  bookingInformation(context: ProviderContext, data: ProviderOperationData) {
    this.require(data, ["referenceId", "reservationId", "guestTrackerId"]);
    return {
      partner_hotel_code: context.providerHotelId,
      reference_id: data.referenceId,
      reservation_id: data.reservationId,
      guest_tracker_id: data.guestTrackerId,
      api_version: this.apiVersion,
      source_id: this.sourceId,
      sub_source_id: this.subSourceId,
    };
  }

  fetchReservation(context: ProviderContext, data: ProviderOperationData) {
    this.require(data, ["searchKey", "searchValue"]);
    return {
      PartnerHotelCode: context.providerHotelId,
      searchKey: data.searchKey,
      searchValue: data.searchValue,
      ...(data.date ? { date: data.date } : {}),
      guestDetailedInfo: data.guestDetailedInfo ?? true,
    };
  }

  roomAvailability(context: ProviderContext, data: ProviderOperationData) {
    this.require(data, ["startDate", "endDate", "rooms"]);
    return {
      api_version: this.apiVersion,
      start_date: data.startDate,
      end_date: data.endDate,
      source_id: this.sourceId,
      sub_source_id: this.subSourceId,
      multiple_category_allowed: true,
      party: Array.isArray(data.rooms)
        ? data.rooms.map((room) => {
            const value = room as Record<string, unknown>;
            return {
              adults: value.adults,
              children: value.childrenAges ?? value.children ?? [],
            };
          })
        : data.rooms,
      requested_payload: { categories: { hotel_details: true } },
      hotels: [{ partner_hotel_code: context.providerHotelId }],
    };
  }

  roomStatus(context: ProviderContext, data: ProviderOperationData) {
    this.require(data, ["roomNumber"]);
    return {
      api_version: this.apiVersion,
      partner_hotel_code: context.providerHotelId,
      room_number: data.roomNumber,
    };
  }

  checkIn(context: ProviderContext, data: ProviderOperationData) {
    this.require(data, ["folioNumber"]);
    return {
      api_version: this.apiVersion,
      folio_number: data.folioNumber,
      stay_status: 1,
      partner_hotel_code: context.providerHotelId,
      housekeeping_soft_check: data.housekeepingSoftCheck ?? false,
    };
  }

  checkOut(context: ProviderContext, data: ProviderOperationData) {
    this.require(data, ["folioNumber"]);
    return {
      api_version: this.apiVersion,
      folio_number: data.folioNumber,
      stay_status: 2,
      partner_hotel_code: context.providerHotelId,
    };
  }

  cancellation(context: ProviderContext, data: ProviderOperationData) {
    this.require(data, ["folioNumber"]);
    return {
      api_version: this.apiVersion,
      folio_number: data.folioNumber,
      cancellation_rule: data.cancellationRule ?? false,
      partner_hotel_code: context.providerHotelId,
      remark: data.remark,
      is_free_cancellation: data.isFreeCancellation,
      cancellation_charge: data.cancellationCharge,
    };
  }

  bookingUpdate(context: ProviderContext, data: ProviderOperationData) {
    this.require(data, ["folioNumber", "rooms"]);
    return {
      api_version: this.apiVersion,
      partner_hotel_code: context.providerHotelId,
      folio_number: data.folioNumber,
      folio_internal_notes: data.folioInternalNotes ?? "",
      rooms: this.snakeCaseDeep(data.rooms),
    };
  }

  response(value: unknown): ProviderOperationResponse {
    return this.camelCaseDeep(value) as ProviderOperationResponse;
  }

  private base(context: ProviderContext) {
    return {
      api_version: this.apiVersion,
      source_id: this.sourceId,
      sub_source_id: this.subSourceId,
      partner_hotel_code: context.providerHotelId,
    };
  }

  private get apiVersion() {
    return Number(this.config.get("DJUBO_API_VERSION", "9"));
  }
  
  private get sourceId() {
    return Number(this.config.get("DJUBO_SOURCE_ID", 105));
  }
  
  private get subSourceId() {
    return Number(this.config.get("DJUBO_SUB_SOURCE_ID", 110));
  }

  private snakeCaseDeep(value: unknown): unknown {
    if (Array.isArray(value))
      return value.map((item) => this.snakeCaseDeep(item));
    if (!value || typeof value !== "object") return value;
    const exceptions: Record<string, string> = {
      addOns: "addOns",
      promoSelectedPg: "promoSelectedPg",
      pV: "p_v",
      childrenAges: "children",
    };
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        exceptions[key] ??
          key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
        this.snakeCaseDeep(item),
      ]),
    );
  }

  private camelCaseDeep(value: unknown): unknown {
    if (Array.isArray(value))
      return value.map((item) => this.camelCaseDeep(item));
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key
          .replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())
          .replace(/^[A-Z]/, (letter) => letter.toLowerCase()),
        this.camelCaseDeep(item),
      ]),
    );
  }

  private require(data: ProviderOperationData, fields: string[]) {
    const missing = fields.filter(
      (field) =>
        data[field] === undefined || data[field] === null || data[field] === "",
    );
    if (missing.length)
      throw new GatewayException(
        "VALIDATION_FAILED",
        `Missing required fields: ${missing.join(", ")}`,
        HttpStatus.BAD_REQUEST,
      );
  }

  private requireOne(data: ProviderOperationData, fields: string[]) {
    if (
      !fields.some(
        (field) =>
          data[field] !== undefined &&
          data[field] !== null &&
          data[field] !== "",
      )
    )
      throw new GatewayException(
        "VALIDATION_FAILED",
        `At least one field is required: ${fields.join(", ")}`,
        HttpStatus.BAD_REQUEST,
      );
  }

  private assignWhenDefined(
    target: Record<string, unknown>,
    key: string,
    value: unknown,
  ) {
    if (value !== undefined) target[key] = value;
  }

  private amount(value: unknown): number {
    if (!value || typeof value !== "object" || Array.isArray(value)) return NaN;
    return Number((value as Record<string, unknown>).amount);
  }

  private validatePaymentMode(
    payments: unknown,
    paymentMethod: unknown,
    finalPriceAtBooking: unknown,
    finalPriceAtCheckout: unknown,
  ): boolean {
    this.requireMoney(finalPriceAtBooking, "finalPriceAtBooking");
    this.requireMoney(finalPriceAtCheckout, "finalPriceAtCheckout");
    const bookingAmount = this.amount(finalPriceAtBooking);
    const checkoutAmount = this.amount(finalPriceAtCheckout);
    const bookingCurrency = this.currency(finalPriceAtBooking);
    const checkoutCurrency = this.currency(finalPriceAtCheckout);
    if (
      !Number.isFinite(bookingAmount) ||
      !Number.isFinite(checkoutAmount) ||
      bookingAmount < 0 ||
      checkoutAmount < 0 ||
      bookingAmount + checkoutAmount <= 0
    )
      throw new GatewayException(
        "VALIDATION_FAILED",
        "Booking and checkout prices must be non-negative and have a positive total",
        HttpStatus.BAD_REQUEST,
      );
    if (bookingCurrency !== checkoutCurrency)
      throw new GatewayException(
        "VALIDATION_FAILED",
        "finalPriceAtBooking.currency must match finalPriceAtCheckout.currency",
        HttpStatus.BAD_REQUEST,
      );

    const hasPayments = payments !== undefined && payments !== null;
    if (!hasPayments) {
      if (paymentMethod !== undefined && paymentMethod !== null)
        throw new GatewayException(
          "VALIDATION_FAILED",
          "paymentMethod cannot be supplied without payments",
          HttpStatus.BAD_REQUEST,
        );
      if (bookingAmount !== 0 || checkoutAmount <= 0)
        throw new GatewayException(
          "VALIDATION_FAILED",
          "Without payments, finalPriceAtBooking.amount must be 0 and finalPriceAtCheckout.amount must be greater than 0",
          HttpStatus.BAD_REQUEST,
        );
      return true;
    }

    if (bookingAmount <= 0)
      throw new GatewayException(
        "VALIDATION_FAILED",
        "When payments is supplied, finalPriceAtBooking.amount must be greater than 0",
        HttpStatus.BAD_REQUEST,
      );
    const paymentAmount = this.amount(payments);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0)
      throw new GatewayException(
        "VALIDATION_FAILED",
        "payments.amount must be greater than 0",
        HttpStatus.BAD_REQUEST,
      );
    if (paymentAmount !== bookingAmount)
      throw new GatewayException(
        "VALIDATION_FAILED",
        "payments.amount must equal finalPriceAtBooking.amount",
        HttpStatus.BAD_REQUEST,
      );
    return false;
  }

  private validateBookingRoomTokens(rooms: unknown, partnerData: unknown) {
    if (
      !partnerData ||
      typeof partnerData !== "object" ||
      Array.isArray(partnerData)
    )
      throw new GatewayException(
        "VALIDATION_FAILED",
        "partnerData must be an object keyed by availability room_id",
        HttpStatus.BAD_REQUEST,
      );
    const tokens = partnerData as Record<string, unknown>;
    const tokenRoomIds = Object.keys(tokens);
    if (
      !tokenRoomIds.length ||
      tokenRoomIds.some((roomId) => !/^\d+$/.test(roomId))
    )
      throw new GatewayException(
        "VALIDATION_FAILED",
        "partnerData must contain numeric availability room_id keys",
        HttpStatus.BAD_REQUEST,
      );
    if (
      Object.values(tokens).some(
        (token) => typeof token !== "string" || !token.trim(),
      )
    )
      throw new GatewayException(
        "VALIDATION_FAILED",
        "Each partnerData room_id must contain a non-empty DJUBO partner_data token",
        HttpStatus.BAD_REQUEST,
      );
    const partyCount = Array.isArray(rooms)
      ? rooms.reduce((count, room) => {
          const value =
            room && typeof room === "object"
              ? (room as Record<string, unknown>)
              : {};
          return count + (Array.isArray(value.party) ? value.party.length : 0);
        }, 0)
      : 0;
    if (!partyCount || partyCount !== tokenRoomIds.length)
      throw new GatewayException(
        "VALIDATION_FAILED",
        `partnerData token count (${tokenRoomIds.length}) must match booking party count (${partyCount})`,
        HttpStatus.BAD_REQUEST,
      );
  }

  private validateStay(startDate: unknown, endDate: unknown) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (
      typeof startDate !== "string" ||
      typeof endDate !== "string" ||
      !datePattern.test(startDate) ||
      !datePattern.test(endDate) ||
      endDate <= startDate
    )
      throw new GatewayException(
        "VALIDATION_FAILED",
        "startDate and endDate must be valid dates and endDate must be after startDate",
        HttpStatus.BAD_REQUEST,
      );
  }

  private validateBookingRooms(rooms: unknown) {
    if (!Array.isArray(rooms) || !rooms.length)
      throw new GatewayException(
        "VALIDATION_FAILED",
        "rooms must be a non-empty array",
        HttpStatus.BAD_REQUEST,
      );
    const parties = rooms.flatMap((rawRoom) => {
      const room =
        rawRoom && typeof rawRoom === "object"
          ? (rawRoom as Record<string, unknown>)
          : {};
      return Array.isArray(room.party) ? room.party : [];
    });
    if (
      !parties.length ||
      parties.some((rawParty) => {
        const party =
          rawParty && typeof rawParty === "object"
            ? (rawParty as Record<string, unknown>)
            : {};
        const adults = Number(party.adults);
        const children = party.children ?? party.childrenAges ?? [];
        return (
          !Number.isInteger(adults) || adults < 1 || !Array.isArray(children)
        );
      })
    )
      throw new GatewayException(
        "VALIDATION_FAILED",
        "Every booking room requires party entries with at least one adult and a children array",
        HttpStatus.BAD_REQUEST,
      );
  }

  private resolvePartnerData(
    data: ProviderOperationData,
  ): Record<string, unknown> {
    if (data.partnerData !== undefined) {
      if (
        !data.partnerData ||
        typeof data.partnerData !== "object" ||
        Array.isArray(data.partnerData)
      )
        throw new GatewayException(
          "VALIDATION_FAILED",
          "partnerData must be an object keyed by availability roomId",
          HttpStatus.BAD_REQUEST,
        );
      return data.partnerData as Record<string, unknown>;
    }
    if (!Array.isArray(data.roomSelections) || !data.roomSelections.length)
      throw new GatewayException(
        "VALIDATION_FAILED",
        "Either partnerData or roomSelections is required",
        HttpStatus.BAD_REQUEST,
      );
    const entries = data.roomSelections.map((rawSelection) => {
      const selection =
        rawSelection && typeof rawSelection === "object"
          ? (rawSelection as Record<string, unknown>)
          : {};
      const providerData =
        selection.providerData && typeof selection.providerData === "object"
          ? (selection.providerData as Record<string, unknown>)
          : {};
      const payload =
        providerData.payload && typeof providerData.payload === "object"
          ? (providerData.payload as Record<string, unknown>)
          : {};
      const roomId = String(selection.roomId ?? "");
      const bookingToken = payload.bookingToken;
      if (!roomId || bookingToken === undefined)
        throw new GatewayException(
          "VALIDATION_FAILED",
          "Each roomSelection requires roomId and providerData.payload.bookingToken",
          HttpStatus.BAD_REQUEST,
        );
      return [roomId, bookingToken] as const;
    });
    if (new Set(entries.map(([roomId]) => roomId)).size !== entries.length)
      throw new GatewayException(
        "VALIDATION_FAILED",
        "roomSelections contains duplicate roomId values",
        HttpStatus.BAD_REQUEST,
      );
    return Object.fromEntries(entries);
  }

  private requireMoney(value: unknown, fieldName: string) {
    this.requireObjectFields(value, ["amount", "currency"], fieldName);
    const currency = this.currency(value);
    if (!/^[A-Z]{3}$/.test(currency))
      throw new GatewayException(
        "VALIDATION_FAILED",
        `${fieldName}.currency must be a three-letter uppercase currency code`,
        HttpStatus.BAD_REQUEST,
      );
  }

  private currency(value: unknown): string {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";
    return String((value as Record<string, unknown>).currency ?? "");
  }

  private validateRoomSelectionTotal(
    roomSelections: unknown,
    finalPriceAtBooking: unknown,
    finalPriceAtCheckout: unknown,
  ) {
    if (!Array.isArray(roomSelections)) return;
    let selectedTotal = 0;
    for (const rawSelection of roomSelections) {
      const selection =
        rawSelection && typeof rawSelection === "object"
          ? (rawSelection as Record<string, unknown>)
          : {};
      const price =
        selection.price && typeof selection.price === "object"
          ? (selection.price as Record<string, unknown>)
          : {};
      const totalAmount = Number(price.totalAmount);
      if (!Number.isFinite(totalAmount) || totalAmount < 0)
        throw new GatewayException(
          "VALIDATION_FAILED",
          "Each roomSelection requires the selected availability price.totalAmount",
          HttpStatus.BAD_REQUEST,
        );
      selectedTotal += totalAmount;
    }
    const submittedTotal =
      this.amount(finalPriceAtBooking) + this.amount(finalPriceAtCheckout);
    if (
      !Number.isFinite(submittedTotal) ||
      Math.abs(selectedTotal - submittedTotal) > 0.001
    )
      throw new GatewayException(
        "VALIDATION_FAILED",
        "Selected room total must equal finalPriceAtBooking plus finalPriceAtCheckout",
        HttpStatus.BAD_REQUEST,
      );
  }

  private requireObjectFields(
    value: unknown,
    fields: string[],
    objectName: string,
  ) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new GatewayException(
        "VALIDATION_FAILED",
        `${objectName} must be an object`,
        HttpStatus.BAD_REQUEST,
      );
    const object = value as Record<string, unknown>;
    const missing = fields.filter(
      (field) =>
        object[field] === undefined ||
        object[field] === null ||
        object[field] === "",
    );
    if (missing.length)
      throw new GatewayException(
        "VALIDATION_FAILED",
        `Missing required ${objectName} fields: ${missing.join(", ")}`,
        HttpStatus.BAD_REQUEST,
      );
  }
}
