import { ConfigService } from "@nestjs/config";
import { DjuboMapper } from "../src/providers/djubo/mapper/djubo.mapper";

describe("DjuboMapper", () => {
  const mapper = new DjuboMapper(new ConfigService({
    DJUBO_SOURCE_ID: "100",
    DJUBO_SUB_SOURCE_ID: "1001",
    DJUBO_QUERY_KEY: "query",
    DJUBO_AVAILABILITY_ID: "availability",
  }));
  const context = {
    provider: "DJUBO",
    providerHotelId: "318",
    environment: "PRODUCTION",
    requestId: "req-1",
  } as const;

  it("maps the complete DJUBO V9 availability request", () => {
    expect(mapper.availabilityRequest(context, {
      checkIn: "2026-12-28",
      checkOut: "2026-12-29",
      rooms: [{ adults: 2, childrenAges: [] }],
      currency: "INR",
    })).toMatchObject({
      api_version: 9,
      source_id: 100,
      sub_source_id: 1001,
      query_key: "query",
      availability_id: "availability",
      requested_payload: { category_modifiers: { photos: true, text: true } },
    });
  });

  it("preserves the canonical room, rate, price and partner token association", () => {
    const result = mapper.availabilityResponse(context, {
      availability_request: {
        party: [
          { room_id: 101, adults: 2, childrenAges: [] },
          { room_id: 102, adults: 2, children: [] },
        ],
      },
      hotels: { "318": { response_type: "available", available: {
        room_types: {
          "17375": { name: "Premium" },
          "17377": { name: "Standard", max_occupancy: { number_of_adults: 4 } },
        },
        rate_plans: { "1": { meal_plan_description_name: "Room Only" } },
        room_rates: { rate1: {
          room_type_key: "17377",
          rate_plan_key: "1",
          rooms_remaining: 2,
          url: "https://example.test/rate",
          partner_data: "opaque-rate-token",
          price_per_room: {
            "101": { totalPrice: 15800, totalTax: 2844, totalPricePerNight: 15800, totalTaxPerNight: 2844 },
            "102": { totalPrice: 15800, totalTax: 2844, totalPricePerNight: 15800, totalTaxPerNight: 2844 },
          },
          line_items: [
            { type: "rate", price: { currency_of_charge_price: { amount: 31600, currency: "INR" } } },
            { type: "tax", price: { currency_of_charge_price: { amount: 5688, currency: "INR" } } },
          ],
        } },
        partner_booking_details: { payment_policy: "Pay at hotel" },
      } } },
    });

    expect(result).toMatchObject({
      provider: "DJUBO",
      providerHotelId: "318",
      status: "available",
    });
    expect(result.party).toEqual([
      { adults: 2, childrenAges: [], roomId: "101" },
      { adults: 2, childrenAges: [], roomId: "102" },
    ]);
    expect(result.rooms).toHaveLength(2);
    expect(result.rooms[0]).toMatchObject({
      roomName: "Premium",
      providerRoomId: "17375",
      rateOptions: [],
      maxOccupancy: null,
    });
    expect(result.rooms[1]).toMatchObject({
      roomName: "Standard",
      providerRoomId: "17377",
      rateOptions: [{
          providerRatePlanId: "1",
          ratePlanName: "Room Only",
          providerData: { payload: { bookingToken: "opaque-rate-token", tokenScope: "RATE_COMBINATION" } },
          bookable: true,
          pricingIntegrity: {
            roomIdsMatchParty: true,
            baseAmountMatchesLineItems: true,
            taxAmountMatchesLineItems: true,
          },
          pricesByRoomId: {
            "101": { baseAmount: "15800", taxAmount: "2844", totalAmount: "18644" },
            "102": { baseAmount: "15800", taxAmount: "2844", totalAmount: "18644" },
          },
      }],
      maxOccupancy: { number_of_adults: 4 },
    });
  });

  it("returns canonical empty rooms for an unavailable response", () => {
    expect(mapper.availabilityResponse(context, {
      availability_request: { party: [{ room_id: 101, adults: 2, children: [] }] },
      hotels: { "318": { response_type: "unavailable" } },
    })).toEqual({
      provider: "DJUBO",
      providerHotelId: "318",
      status: "unavailable",
      message: "Data is unavailable from Djubo for partnerCode: 318.",
      party: [{ adults: 2, childrenAges: [], roomId: "101" }],
      rooms: [],
    });
  });

  it("does not mistake an unknown booking response for rejection", () => {
    expect(mapper.bookingResult({ status: "PROCESSING" }).status).toBe("UNKNOWN");
  });
});
