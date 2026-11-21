import type { Disposer } from "./dispatcher";

export interface Clock {
  now(): number;
  subscribe(fn: (t: number) => void): Disposer;
}

export class ManualClock implements Clock {
  private t = 0;
  private subscribers = new Set<(t: number) => void>();

  now(): number {
    return this.t;
  }

  set(t: number): void {
    this.t = t;
    for (const fn of this.subscribers) fn(t);
  }

  subscribe(fn: (t: number) => void): Disposer {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }
}
