import { ConfigService } from "@nestjs/config";
import { DjuboOperationMapper } from "../src/providers/djubo/mapper/djubo-operation.mapper";

describe("DjuboOperationMapper", () => {
  const mapper = new DjuboOperationMapper(new ConfigService({ DJUBO_API_VERSION: "9", DJUBO_SOURCE_ID: "100", DJUBO_SUB_SOURCE_ID: "1001" }));
  const context = { provider: "DJUBO", providerHotelId: "4", environment: "PRODUCTION", requestId: "req-1" } as const;

  it("maps guest creation using the documented mixed field names", () => {
    expect(mapper.createGuest(context, { firstName: "Yash", email: "yash@example.com" })).toMatchObject({
      api_version: 9, source_id: 100, sub_source_id: 1001, partner_hotel_code: "4", guestTrackerId: -1, firstName: "Yash",
    });
  });

  it("does not allow guest creation input to override provider-owned fields", () => {
    expect(mapper.createGuest(context, {
      firstName: "Yash", phone: "8754530655", guestTrackerId: 123,
      api_version: 1, source_id: 2, partner_hotel_code: "attacker-controlled",
    })).toEqual({
      api_version: 9, source_id: 100, sub_source_id: 1001,
      partner_hotel_code: "4", firstName: "Yash", phone: "8754530655",
      guestTrackerId: -1,
    });
  });

  it("maps guest update using the documented tracker and deletion field names", () => {
    expect(mapper.updateGuest(context, {
      guestTrackerId: 169163, firstName: "Yash", email: "yash@example.com",
      guestToBeDeleted: false, api_version: 1,
    })).toEqual({
      api_version: 9, source_id: 100, sub_source_id: 1001,
      partner_hotel_code: "4", firstName: "Yash", email: "yash@example.com",
      guest_tracker_id: 169163, guest_to_be_deleted: false,
    });
  });

  it("maps guest history using the selected hotel by default", () => {
    expect(mapper.guestHistory(context, { guestTrackerId: "169163" })).toEqual({
      api_version: 9, source_id: 100, sub_source_id: 1001,
      guest_tracker_id: "169163", partner_hotel_codes: ["4"],
    });
  });

  it("validates documented guest contact and nested address requirements", () => {
    expect(() => mapper.createGuest(context, { firstName: "Yash", email: "invalid" }))
      .toThrow("email must be a valid email address");
    expect(() => mapper.createGuest(context, {
      firstName: "Yash", phone: "8754530655", address: { addressLine: "Noida" },
    })).toThrow("Missing required address fields: city, state, country, postalCode");
  });

  it("maps booking information as documented query parameters", () => {
    expect(mapper.bookingInformation(context, { referenceId: "ref", reservationId: "res", guestTrackerId: "guest" })).toEqual({
      partner_hotel_code: "4", reference_id: "ref", reservation_id: "res", guest_tracker_id: "guest",
      api_version: 9, source_id: 100, sub_source_id: 1001,
    });
  });

  it("maps fetch reservation using Djubo's documented field casing", () => {
    expect(mapper.fetchReservation(context, {
      searchKey: "Folio Reservation Number",
      searchValue: "GO-100",
    })).toEqual({
      PartnerHotelCode: "4",
      searchKey: "Folio Reservation Number",
      searchValue: "GO-100",
      guestDetailedInfo: true,
    });
  });

  it("maps room availability and room status requests", () => {
    expect(mapper.roomAvailability(context, {
      startDate: "2026-12-10",
      endDate: "2026-12-12",
      rooms: [{ adults: 2, childrenAges: [7] }],
    })).toEqual({
      api_version: 9,
      start_date: "2026-12-10",
      end_date: "2026-12-12",
      source_id: 100,
      sub_source_id: 1001,
      multiple_category_allowed: true,
      party: [{ adults: 2, children: [7] }],
      requested_payload: { categories: { hotel_details: true } },
      hotels: [{ partner_hotel_code: "4" }],
    });
    expect(mapper.roomStatus(context, { roomNumber: "6045-GH3" })).toEqual({
      api_version: 9,
      partner_hotel_code: "4",
      room_number: "6045-GH3",
    });
  });

  it("defaults cancellation to a safe rule lookup", () => {
    expect(mapper.cancellation(context, { folioNumber: "GO-100" })).toEqual({
      api_version: 9,
      folio_number: "GO-100",
      cancellation_rule: true,
      partner_hotel_code: "4",
    });
  });

  it("maps an explicit cancellation and validates its charge", () => {
    expect(mapper.cancellation(context, {
      folioNumber: "GO-100",
      cancellationRule: false,
      remark: "Change of plans",
      isFreeCancellation: false,
      cancellationCharge: 300,
    })).toEqual({
      api_version: 9,
      folio_number: "GO-100",
      cancellation_rule: false,
      partner_hotel_code: "4",
      remark: "Change of plans",
      is_free_cancellation: false,
      cancellation_charge: 300,
    });
    expect(() => mapper.cancellation(context, {
      folioNumber: "GO-100", cancellationCharge: -1,
    })).toThrow("cancellationCharge must be a non-negative number");
  });

  it("rejects invalid room availability input", () => {
    expect(() => mapper.roomAvailability(context, {
      startDate: "2026-12-12", endDate: "2026-12-10", rooms: [],
    })).toThrow("endDate must be after startDate");
    expect(() => mapper.roomAvailability(context, {
      startDate: "2026-02-30", endDate: "2026-03-02",
      rooms: [{ adults: 1, childrenAges: [] }],
    })).toThrow("startDate and endDate must be valid dates");
  });

  it("maps provider responses recursively to camelCase", () => {
    expect(mapper.response({ voucher_cancelled: true, cancellation_data: { applicable_slab: { day_from_check_in: 1 } } })).toEqual({
      voucherCancelled: true, cancellationData: { applicableSlab: { dayFromCheckIn: 1 } },
    });
  });

  it("rejects missing mandatory operation fields", () => {
    expect(() => mapper.fetchReservation(context, { searchKey: "Folio Reservation Number" })).toThrow("Missing required fields: searchValue");
  });

  it("requires booking payment details", () => {
    expect(() => mapper.bookingSubmit(context, {
      startDate: "2026-12-10", endDate: "2026-12-12", referenceId: "AIRIQ-1", customer: {},
      rooms: [{ party: [{ adults: 2, children: [] }] }],
      addOns: [], finalPriceAtBooking: { amount: 100, currency: "INR" },
      finalPriceAtCheckout: { amount: 0, currency: "INR" }, partnerData: {},
    })).toThrow("Without payments, finalPriceAtBooking.amount must be 0");
  });

  it("rejects payments for a pay-at-checkout booking", () => {
    expect(() => mapper.bookingSubmit(context, {
      startDate: "2026-12-10",
      endDate: "2026-12-12",
      referenceId: "AIRIQ-PAY-LATER-1",
      customer: {},
      rooms: [{ party: [{ adults: 2, children: [] }] }],
      payments: {
        pgTransactionId: "pay-later-1",
        pgReferenceId: "order-later-1",
        amount: 10490,
        payeeInfo: {},
      },
      paymentMethod: { cardNumber: "must-not-reach-djubo" },
      finalPriceAtBooking: { amount: 0, currency: "INR" },
      finalPriceAtCheckout: { amount: 10490, currency: "INR" },
      partnerData: { "101": "opaque-token" },
    })).toThrow("When payments is supplied, finalPriceAtBooking.amount must be greater than 0");
  });

  it("allows pay-at-checkout booking without payment objects", () => {
    const result = mapper.bookingSubmit(context, {
      startDate: "2026-12-21",
      endDate: "2026-12-22",
      referenceId: "AIRIQ-CHECKOUT-ONLY",
      customer: {},
      rooms: [{ party: [{ adults: 2, children: [] }] }],
      finalPriceAtBooking: { amount: 0, currency: "INR" },
      finalPriceAtCheckout: { amount: 10235, currency: "INR" },
      partnerData: { "101": "checkout-rate-token" },
    });
    expect(result).not.toHaveProperty("payments");
    expect(result).not.toHaveProperty("payment_method");
    expect(result).toMatchObject({
      final_price_at_booking: { amount: 0, currency: "INR" },
      final_price_at_checkout: { amount: 10235, currency: "INR" },
      partner_data: { "101": "checkout-rate-token" },
    });
  });

  it("rejects zero checkout amount when payments is absent", () => {
    expect(() => mapper.bookingSubmit(context, {
      startDate: "2026-12-21", endDate: "2026-12-22", referenceId: "AIRIQ-NO-PAYMENT",
      customer: {}, rooms: [{ party: [{ adults: 2, children: [] }] }],
      finalPriceAtBooking: { amount: 0, currency: "INR" },
      finalPriceAtCheckout: { amount: 0, currency: "INR" },
      partnerData: { "101": "token" },
    })).toThrow("positive total");
  });

  it("rejects payment method when payments is absent", () => {
    expect(() => mapper.bookingSubmit(context, {
      startDate: "2026-12-21", endDate: "2026-12-22", referenceId: "AIRIQ-METHOD-ONLY",
      customer: {}, rooms: [{ party: [{ adults: 2, children: [] }] }],
      paymentMethod: { cardNumber: "not-allowed" },
      finalPriceAtBooking: { amount: 0, currency: "INR" },
      finalPriceAtCheckout: { amount: 100, currency: "INR" },
      partnerData: { "101": "token" },
    })).toThrow("paymentMethod cannot be supplied without payments");
  });

  it("rejects different booking and checkout currencies", () => {
    expect(() => mapper.bookingSubmit(context, {
      startDate: "2026-12-21", endDate: "2026-12-22", referenceId: "AIRIQ-CURRENCY",
      customer: {}, rooms: [{ party: [{ adults: 2, children: [] }] }],
      finalPriceAtBooking: { amount: 0, currency: "INR" },
      finalPriceAtCheckout: { amount: 100, currency: "USD" },
      partnerData: { "101": "token" },
    })).toThrow("finalPriceAtBooking.currency must match finalPriceAtCheckout.currency");
  });

  it("maps booking submit without requiring optional DJUBO fields", () => {
    const result = mapper.bookingSubmit(context, {
      startDate: "2026-12-10",
      endDate: "2026-12-12",
      referenceId: "AIRIQ-1",
      customer: {
        firstName: "Deepak",
        lastName: "Pal",
        phoneNumber: "9876543210",
        email: "deepak@example.com",
        country: "IN",
      },
      rooms: [{
        party: [{ adults: 2, childrenAges: [] }],
        travelerFirstName: "Deepak",
        travelerLastName: "Pal",
      }],
      paymentMethod: {
        cardType: "Visa",
        cardNumber: "4111111111111111",
        cardholderName: "Deepak Pal",
        expirationMonth: "12",
        expirationYear: "2028",
        cvv: "123",
        billingAddress: {},
      },
      payments: {
        pgTransactionId: "pay-1",
        pgReferenceId: "order-1",
        amount: 10710,
        paymentType: 3,
        cardType: 1,
        payeeInfo: {},
      },
      finalPriceAtBooking: { amount: 10710, currency: "INR" },
      finalPriceAtCheckout: { amount: 0, currency: "INR" },
      partnerData: { "101": "opaque-token" },
      cartId: "must-not-reach-djubo",
      paymentId: "must-not-reach-djubo",
    });

    expect(result).toMatchObject({
      api_version: 9,
      partner_hotel_code: "4",
      start_date: "2026-12-10",
      end_date: "2026-12-12",
      reference_id: "AIRIQ-1",
      multiple_category_allowed: true,
      payments: {
        pg_transaction_id: "pay-1",
        pg_reference_id: "order-1",
        payment_type: 3,
        card_type: 1,
      },
      partner_data: { "101": "opaque-token" },
    });
    expect(result).not.toHaveProperty("cartId");
    expect(result).not.toHaveProperty("paymentId");
    expect(result).not.toHaveProperty("ip_address");
    expect(result).not.toHaveProperty("customer_list");
    expect(result).not.toHaveProperty("addOns");
    expect(result).not.toHaveProperty("promo_details");
    expect(result).not.toHaveProperty("special_requests");
    expect(result).not.toHaveProperty("partner_room_data");
  });

  it("rejects partner tokens that do not cover every booking party room", () => {
    expect(() => mapper.bookingSubmit(context, {
      startDate: "2026-12-10", endDate: "2026-12-12", referenceId: "AIRIQ-2",
      customer: {}, rooms: [{ party: [{ adults: 2 }, { adults: 2 }] }],
      payments: { pgTransactionId: "pay", pgReferenceId: "order", amount: 100, payeeInfo: {} },
      finalPriceAtBooking: { amount: 100, currency: "INR" }, finalPriceAtCheckout: { amount: 0, currency: "INR" },
      partnerData: { "101": "one-token" },
    })).toThrow("partnerData token count (1) must match booking party count (2)");
  });

  it("rejects a paid booking whose payment and booking amounts differ", () => {
    expect(() => mapper.bookingSubmit(context, {
      startDate: "2026-12-10", endDate: "2026-12-12", referenceId: "AIRIQ-3",
      customer: {}, rooms: [{ party: [{ adults: 2 }] }],
      payments: { pgTransactionId: "pay", pgReferenceId: "order", amount: 99, payeeInfo: {} },
      finalPriceAtBooking: { amount: 100, currency: "INR" }, finalPriceAtCheckout: { amount: 0, currency: "INR" },
      partnerData: { "101": "one-token" },
    })).toThrow("payments.amount must equal finalPriceAtBooking.amount");
  });

  it("builds DJUBO partner_data from provider-neutral room selections", () => {
    const result = mapper.bookingSubmit(context, {
      startDate: "2026-12-10", endDate: "2026-12-12", referenceId: "AIRIQ-4",
      customer: {}, rooms: [{ party: [{ adults: 2 }, { adults: 3 }] }],
      payments: { pgTransactionId: "pay", pgReferenceId: "order", amount: 200, payeeInfo: {} },
      finalPriceAtBooking: { amount: 200, currency: "INR" }, finalPriceAtCheckout: { amount: 0, currency: "INR" },
      roomSelections: [
        { roomId: "101", price: { totalAmount: "100" }, providerData: { payload: { bookingToken: "shared-rate-token" } } },
        { roomId: "102", price: { totalAmount: "100" }, providerData: { payload: { bookingToken: "shared-rate-token" } } },
      ],
    });
    expect(result.partner_data).toEqual({
      "101": "shared-rate-token",
      "102": "shared-rate-token",
    });
  });
});
