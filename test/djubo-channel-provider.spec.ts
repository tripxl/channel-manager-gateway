import { DjuboChannelProvider } from "../src/providers/djubo/djubo-channel.provider";
import { DjuboClient } from "../src/providers/djubo/client/djubo.client";
import { DjuboMapper } from "../src/providers/djubo/mapper/djubo.mapper";
import { DjuboOperationMapper } from "../src/providers/djubo/mapper/djubo-operation.mapper";

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
