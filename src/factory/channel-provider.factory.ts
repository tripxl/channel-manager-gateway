import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ChannelProvider } from "../interfaces/channel-provider.interface";
import { ProviderCode } from "../contracts/common/provider.types";
import { GatewayException } from "../common/errors/gateway.exception";

export const CHANNEL_PROVIDERS = Symbol("CHANNEL_PROVIDERS");

@Injectable()
export class ChannelProviderFactory {
  private readonly providers: Map<ProviderCode, ChannelProvider>;
  constructor(@Inject(CHANNEL_PROVIDERS) providers: ChannelProvider[]) {
    this.providers = new Map(
      providers.map((provider) => [provider.code, provider]),
    );
  }

  get(code: ProviderCode) {
    const provider = this.providers.get(code);
    if (!provider)
      throw new GatewayException(
        "UNSUPPORTED_PROVIDER",
        `Provider ${code} is not configured`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    return provider;
  }

  capabilities() {
    return [...this.providers.values()].map(({ code, capabilities }) => ({
      provider: code,
      ...capabilities,
    }));
  }
}
