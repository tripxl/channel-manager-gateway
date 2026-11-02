import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProviderContext } from "../../../contracts/common/provider.types";
import { ConcurrencyLimiter } from "../../../common/http/concurrency-limiter";
import { ProviderHttpTransport } from "../../../common/http/provider-http.transport";
import {
  DJUBO_DEFAULT_BASE_URL,
  DJUBO_ENDPOINTS,
} from "../api/djubo-api.constants";
import { DjuboAuthStrategy } from "../config/djubo-auth.strategy";
import { DjuboAvailabilityRequest } from "../models/requests/djubo-availability.request";
import { DjuboAvailabilityResponse } from "../models/responses/djubo-availability.response";

@Injectable()
export class DjuboClient {
  private readonly limiter: ConcurrencyLimiter;
  constructor(
    private readonly config: ConfigService,
    private readonly auth: DjuboAuthStrategy,
    private readonly transport: ProviderHttpTransport,
  ) {
    this.limiter = new ConcurrencyLimiter(
      this.config.get<number>("DJUBO_MAX_CONCURRENCY", 20),
    );
  }

  async checkAvailability(
    context: ProviderContext,
    request: DjuboAvailabilityRequest,
  ): Promise<DjuboAvailabilityResponse> {
    return this.request<DjuboAvailabilityResponse>("availability", context, request, true);
  }

  async request<T>(
    operation: keyof typeof DJUBO_ENDPOINTS,
    context: ProviderContext,
    payload: unknown,
    safeToRetry = false,
  ): Promise<T> {
    const endpoint = DJUBO_ENDPOINTS[operation];
    const headers = await this.auth.getHeaders(context);
    const baseURL = this.config.get("DJUBO_BASE_URL", DJUBO_DEFAULT_BASE_URL);
    return this.limiter.run(() =>
      this.transport.request<T>(
        {
          baseURL,
          url: endpoint.path,
          method: endpoint.method,
          headers: {
            ...headers,
            "content-type": "application/json",
            "x-request-id": context.requestId,
          },
          ...(endpoint.method === "GET" ? { params: payload } : { data: payload }),
        },
        {
          provider: "DJUBO",
          operation,
          requestId: context.requestId,
          timeoutMs: this.config.get("DJUBO_TIMEOUT_MS", 10000),
          retries: this.config.get("DJUBO_READ_RETRIES", 2),
          safeToRetry,
        },
      ),
    );
  }
}
