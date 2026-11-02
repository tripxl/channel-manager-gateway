import { Injectable } from '@nestjs/common';

@Injectable()
export class ConcurrencyLimiter {
  private active = 0;
  private readonly waiting: Array<() => void> = [];
  constructor(private readonly maximum: number) {}
  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= this.maximum) await new Promise<void>(resolve => this.waiting.push(resolve));
    this.active++;
    try { return await work(); }
    finally { this.active--; this.waiting.shift()?.(); }
  }
}
