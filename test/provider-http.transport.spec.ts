import axios from "axios";
import { ProviderHttpTransport } from "../src/common/http/provider-http.transport";

describe("ProviderHttpTransport booking errors", () => {
  afterEach(() => jest.restoreAllMocks());

  it("maps a structured DJUBO server rejection to BOOKING_FAILED", async () => {
    jest.spyOn(axios, "request").mockRejectedValue({
      code: "ERR_BAD_RESPONSE",
      response: { status: 500, data: { error_code: "DD_0012", error_message: "Invalid booking data" } },
    });
    const transport = new ProviderHttpTransport();
    await expect(transport.request({}, {
      provider: "DJUBO", operation: "booking", timeoutMs: 1000, safeToRetry: false, requestId: "req-1",
    })).rejects.toMatchObject({ code: "BOOKING_FAILED", details: { providerHttpStatus: 500, providerErrorCode: "DD_0012" } });
  });

  it("keeps an ambiguous connection failure as BOOKING_STATUS_UNKNOWN", async () => {
    jest.spyOn(axios, "request").mockRejectedValue({ code: "ECONNRESET" });
    const transport = new ProviderHttpTransport();
    await expect(transport.request({}, {
      provider: "DJUBO", operation: "booking", timeoutMs: 1000, safeToRetry: false, requestId: "req-2",
    })).rejects.toMatchObject({ code: "BOOKING_STATUS_UNKNOWN", details: { transportCode: "ECONNRESET" } });
  });
});
