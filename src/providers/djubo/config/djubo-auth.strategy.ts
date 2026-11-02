import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderContext } from '../../../contracts/common/provider.types';

@Injectable()
export class DjuboAuthStrategy {
  constructor(private readonly config: ConfigService) {}
  async getHeaders(_context: ProviderContext) {
    const token = this.config.get<string>('DJUBO_AUTH_TOKEN') || this.config.get<string>('DJUBO_API_TOKEN');
    if (!token) return {};
    const parameter = token.replace(/^DJUBO-TOKEN\s+/i, '');
    return { Authorization: `DJUBO-TOKEN ${parameter}` };
  }
}
