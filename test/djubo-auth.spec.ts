import { ConfigService } from '@nestjs/config';
import { DjuboAuthStrategy } from '../src/providers/djubo/config/djubo-auth.strategy';

describe('DjuboAuthStrategy', () => {
  const context = { provider: 'DJUBO', providerHotelId: '318', environment: 'PRODUCTION', requestId: 'req-1' } as const;

  it('normalizes a legacy raw DJUBO_API_TOKEN', async () => {
    const strategy = new DjuboAuthStrategy(new ConfigService({ DJUBO_API_TOKEN: 'token-value' }));
    await expect(strategy.getHeaders(context)).resolves.toEqual({ Authorization: 'DJUBO-TOKEN token-value' });
  });

  it('does not duplicate an existing DJUBO-TOKEN prefix', async () => {
    const strategy = new DjuboAuthStrategy(new ConfigService({ DJUBO_AUTH_TOKEN: 'DJUBO-TOKEN token-value' }));
    await expect(strategy.getHeaders(context)).resolves.toEqual({ Authorization: 'DJUBO-TOKEN token-value' });
  });
});
