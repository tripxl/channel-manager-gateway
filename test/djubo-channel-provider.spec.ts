import { DjuboChannelProvider } from "../src/providers/djubo/djubo-channel.provider";
import { DjuboClient } from "../src/providers/djubo/client/djubo.client";
import { DjuboMapper } from "../src/providers/djubo/mapper/djubo.mapper";
import { DjuboOperationMapper } from "../src/providers/djubo/mapper/djubo-operation.mapper";
import { ConfigService } from "@nestjs/config";

describe("DjuboChannelProvider availability tracing", () => {
  it("returns normalized availability beside the untouched provider response", async () => {
    const rawProviderResponse = {
      availability_request: { party: [{ room_id: 101, adults: 2, children: [] }] },
      hotels: { "318": { response_type: "available" } },
    };
    const normalized = {
      provider: "DJUBO",
      providerHotelId: "318",
      status: "available",
      message: "ok",
      party: [],
      rooms: [],
    };
    const client = {
      checkAvailability: jest.fn().mockResolvedValue(rawProviderResponse),
    };
    const mapper = {
      availabilityRequest: jest.fn().mockReturnValue({ outbound: true }),
      availabilityResponse: jest.fn().mockReturnValue(normalized),
    };
    const provider = new DjuboChannelProvider(
      client as unknown as DjuboClient,
      mapper as unknown as DjuboMapper,
      {} as DjuboOperationMapper,
    );
    const context = {
      provider: "DJUBO",
      providerHotelId: "318",
      environment: "SANDBOX",
      requestId: "req-availability-trace",
    } as const;

    const result = await provider.getAvailability(context, {
      checkIn: "2026-12-28",
      checkOut: "2026-12-29",
      rooms: [{ adults: 2, childrenAges: [] }],
      currency: "INR",
    });

    expect(result).toEqual({
      ...normalized,
      requestId: "req-availability-trace",
      trace: {
        mappingVersion: 1,
        rawProviderResponse,
      },
    });
    expect(result.trace.rawProviderResponse).toBe(rawProviderResponse);
  });
});

describe("DjuboChannelProvider guest operations", () => {
  const context = {
    provider: "DJUBO",
    providerHotelId: "318",
    environment: "SANDBOX",
    requestId: "req-guest",
  } as const;
  let request: jest.Mock;
  let provider: DjuboChannelProvider;

  beforeEach(() => {
    request = jest.fn();
    const operationMapper = new DjuboOperationMapper(
      new ConfigService({
        DJUBO_API_VERSION: "9",
        DJUBO_SOURCE_ID: "418",
        DJUBO_SUB_SOURCE_ID: "221",
      }),
    );
    provider = new DjuboChannelProvider(
      { request } as unknown as DjuboClient,
      {} as DjuboMapper,
      operationMapper,
    );
  });

  it("creates a guest through guest-populate and normalizes the response", async () => {
    request.mockResolvedValue({ guest_tracker_id: 169163 });

    await expect(
      provider.createGuest(context, {
        firstName: "Yash",
        phone: "8754530655",
      }),
    ).resolves.toEqual({ guestTrackerId: 169163 });
    expect(request).toHaveBeenCalledWith(
      "guestCreate",
      context,
      expect.objectContaining({
        api_version: 9,
        partner_hotel_code: "318",
        guestTrackerId: -1,
        firstName: "Yash",
      }),
      false,
    );
  });

  it("updates a guest through guest-populate without retrying the write", async () => {
    request.mockResolvedValue({ guest_tracker_id: 169163, is_updated: true });

    await expect(
      provider.updateGuest(context, {
        guestTrackerId: 169163,
        firstName: "Yash",
        email: "yash@example.com",
      }),
    ).resolves.toEqual({ guestTrackerId: 169163, isUpdated: true });
    expect(request).toHaveBeenCalledWith(
      "guestUpdate",
      context,
      expect.objectContaining({
        guest_tracker_id: 169163,
        guest_to_be_deleted: false,
      }),
      false,
    );
  });

  it("searches guest history as a retry-safe read and normalizes every item", async () => {
    request.mockResolvedValue([
      { guest_tracker_id: "169163", folio_number: "GO-1" },
    ]);

    await expect(
      provider.getGuestHistory(context, { guestTrackerId: "169163" }),
    ).resolves.toEqual([
      { guestTrackerId: "169163", folioNumber: "GO-1" },
    ]);
    expect(request).toHaveBeenCalledWith(
      "guestHistory",
      context,
      expect.objectContaining({
        guest_tracker_id: "169163",
        partner_hotel_codes: ["318"],
      }),
      true,
    );
  });
});

describe("DjuboChannelProvider reservation operations", () => {
  const context = {
    provider: "DJUBO",
    providerHotelId: "318",
    environment: "SANDBOX",
    requestId: "req-reservation",
  } as const;
  let request: jest.Mock;
  let provider: DjuboChannelProvider;

  beforeEach(() => {
    request = jest.fn().mockResolvedValue({ voucher_updated: true });
    provider = new DjuboChannelProvider(
      { request } as unknown as DjuboClient,
      {} as DjuboMapper,
      new DjuboOperationMapper(new ConfigService({
        DJUBO_API_VERSION: "9",
        DJUBO_SOURCE_ID: "418",
        DJUBO_SUB_SOURCE_ID: "221",
      })),
    );
  });

  it.each([
    [
      "bookingInformation",
      () => provider.getBookingInformation(context, {
        referenceId: "AIRIQ-1", reservationId: "GO-1", guestTrackerId: "169163",
      }),
      "bookingInformation",
      expect.objectContaining({ reference_id: "AIRIQ-1", reservation_id: "GO-1" }),
    ],
    [
      "reservation",
      () => provider.fetchReservation(context, {
        searchKey: "Folio Reservation Number", searchValue: "GO-1",
      }),
      "reservation",
      expect.objectContaining({ PartnerHotelCode: "318", searchValue: "GO-1" }),
    ],
    [
      "roomAvailability",
      () => provider.fetchRoomNumbers(context, {
        startDate: "2026-12-10", endDate: "2026-12-11",
        rooms: [{ adults: 2, childrenAges: [] }],
      }),
      "roomAvailability",
      expect.objectContaining({ hotels: [{ partner_hotel_code: "318" }] }),
    ],
    [
      "roomStatus",
      () => provider.fetchRoomStatus(context, { roomNumber: "304-A" }),
      "roomStatus",
      expect.objectContaining({ room_number: "304-A" }),
    ],
  ])("executes %s as a retry-safe read", async (_name, invoke, operation, payload) => {
    await invoke();
    expect(request).toHaveBeenCalledWith(operation, context, payload, true);
  });

  it("treats a cancellation-rule lookup as retry-safe", async () => {
    request.mockResolvedValue({ cancellation_data: { applicable_slab: { penalty: 20 } } });
    await expect(provider.cancelReservation(context, { folioNumber: "GO-1" }))
      .resolves.toEqual({ cancellationData: { applicableSlab: { penalty: 20 } } });
    expect(request).toHaveBeenCalledWith(
      "cancellation", context,
      expect.objectContaining({ cancellation_rule: true }), true,
    );
  });

  it("never retries an explicit cancellation write", async () => {
    request.mockResolvedValue({ voucher_cancelled: true });
    await expect(provider.cancelReservation(context, {
      folioNumber: "GO-1", cancellationRule: false,
    })).resolves.toEqual({ voucherCancelled: true });
    expect(request).toHaveBeenCalledWith(
      "cancellation", context,
      expect.objectContaining({ cancellation_rule: false }), false,
    );
  });
});
