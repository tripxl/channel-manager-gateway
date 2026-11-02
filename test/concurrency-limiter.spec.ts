import { ConcurrencyLimiter } from '../src/common/http/concurrency-limiter';
describe('ConcurrencyLimiter', () => {
  it('limits simultaneous work', async () => {
    const limiter = new ConcurrencyLimiter(2); let active = 0; let maximum = 0;
    const work = () => limiter.run(async () => { active++; maximum = Math.max(maximum, active); await new Promise(resolve => setTimeout(resolve, 5)); active--; });
    await Promise.all([work(), work(), work(), work()]); expect(maximum).toBe(2);
  });
});
