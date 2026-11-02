import { HttpStatus, Injectable } from "@nestjs/common";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { GatewayException } from "../errors/gateway.exception";

export interface TransportOptions {
  provider: string;
  operation: string;
  timeoutMs: number;
  retries?: number;
  safeToRetry: boolean;
  requestId: string;
}
@Injectable()
export class ProviderHttpTransport {
  async request<T>(
    config: AxiosRequestConfig,
    options: TransportOptions,
  ): Promise<T> {
    const maximumAttempts = options.safeToRetry
      ? 1 + (options.retries ?? 0)
      : 1;
    for (let attempt = 1; attempt <= maximumAttempts; attempt++) {
      try {
        const response: AxiosResponse<T> = await axios.request<T>({
          ...config,
          timeout: options.timeoutMs,
          maxRedirects: 0,
        });
        return response.data;
      } catch (error) {
        const mapped = this.mapError(
          error,
          options.operation,
          !options.safeToRetry,
        );
        if (attempt === maximumAttempts || !mapped.retryable) {
          throw mapped;
        }
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.min(1000, 100 * 2 ** (attempt - 1)) +
              Math.floor(Math.random() * 100),
          ),
        );
      }
    }
    throw new GatewayException(
      "PROVIDER_UNAVAILABLE",
      "Provider call failed",
      HttpStatus.SERVICE_UNAVAILABLE,
      true,
    );
  }

  private mapError(error: unknown, operation: string, write: boolean) {
    const axiosError = error as AxiosError;
    if (axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT") {
      const suffix = write
        ? " The provider outcome may be unknown; verify before retrying."
        : "";
      return new GatewayException(
        write ? "BOOKING_STATUS_UNKNOWN" : "PROVIDER_TIMEOUT",
        `Provider ${operation} timed out.${suffix}`,
        HttpStatus.GATEWAY_TIMEOUT,
        !write,
        this.diagnostics(axiosError),
      );
    }
    const status = axiosError.response?.status;
    const providerErrorCode = this.providerErrorCode(axiosError);
    if (status === 429)
      return new GatewayException(
        "PROVIDER_RATE_LIMITED",
        "Provider rate limit exceeded",
        HttpStatus.TOO_MANY_REQUESTS,
        true,
        { providerHttpStatus: status },
      );
    if (status && status >= 400 && status < 500)
      return new GatewayException(
        write ? "BOOKING_FAILED" : "PROVIDER_UNAVAILABLE",
        "Provider rejected the request",
        write ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.BAD_GATEWAY,
        false,
        { providerHttpStatus: status },
      );
    if (write && status && providerErrorCode)
      return new GatewayException(
        "BOOKING_FAILED",
        `Provider rejected the request (${providerErrorCode})`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        false,
        { providerHttpStatus: status, providerErrorCode },
      );
    return new GatewayException(
      write ? "BOOKING_STATUS_UNKNOWN" : "PROVIDER_UNAVAILABLE",
      write
        ? `Provider ${operation} outcome is unknown; verify before retrying.`
        : "Provider is unavailable",
      HttpStatus.SERVICE_UNAVAILABLE,
      !write,
      this.diagnostics(axiosError),
    );
  }

  private diagnostics(error: AxiosError) {
    const providerErrorCode = this.providerErrorCode(error);
    return {
      ...(error.response?.status === undefined ? {} : { providerHttpStatus: error.response.status }),
      ...(error.code ? { transportCode: error.code } : {}),
      ...(providerErrorCode === undefined ? {} : { providerErrorCode: String(providerErrorCode) }),
    };
  }

  private providerErrorCode(error: AxiosError): string | undefined {
    const data = error.response?.data;
    if (!data || typeof data !== "object") return undefined;
    const code = (data as Record<string, unknown>).error_code ?? (data as Record<string, unknown>).code;
    return code === undefined || code === null || code === "" ? undefined : String(code);
  }

}
