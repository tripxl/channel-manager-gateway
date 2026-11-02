import { ChannelProvider } from '../src/interfaces/channel-provider.interface';
import { ChannelProviderFactory } from '../src/factory/channel-provider.factory';
describe('ChannelProviderFactory', () => {
  const adapter = { code: 'DJUBO', capabilities: {} } as ChannelProvider;
  it('routes configured providers', () => expect(new ChannelProviderFactory([adapter]).get('DJUBO')).toBe(adapter));
  it('rejects unconfigured providers', () => expect(() => new ChannelProviderFactory([adapter]).get('STAAH')).toThrow('not configured'));
});
