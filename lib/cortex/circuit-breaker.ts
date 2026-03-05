type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerConfig {
  failureThreshold: number;
  windowSeconds: number;
  cooldownSeconds: number;
}

interface ProviderState {
  state: CircuitState;
  failures: number[]; // timestamps (ms) within the sliding window
  lastFailure: number | null;
  lastStateChange: number;
  successCount: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  lastFailure: number | null;
  lastStateChange: number;
}

export class CircuitBreaker {
  private providers: Map<string, ProviderState> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  recordSuccess(provider: string): void {
    const state = this.getOrCreate(provider);
    state.failures = [];
    state.state = "CLOSED";
    state.successCount++;
    state.lastStateChange = Date.now();
  }

  recordFailure(provider: string): void {
    const state = this.getOrCreate(provider);
    const now = Date.now();

    // Add failure timestamp
    state.failures.push(now);
    state.lastFailure = now;

    // Prune failures outside the sliding window
    this.pruneWindow(state, now);

    // Check if we should trip to OPEN
    if (state.failures.length >= this.config.failureThreshold) {
      state.state = "OPEN";
      state.lastStateChange = now;
    }
  }

  isOpen(provider: string): boolean {
    const state = this.getOrCreate(provider);

    if (state.state === "CLOSED") {
      return false;
    }

    if (state.state === "OPEN") {
      const now = Date.now();
      const cooldownMs = this.config.cooldownSeconds * 1000;
      const elapsed = now - state.lastStateChange;

      if (elapsed >= cooldownMs) {
        // Cooldown expired — transition to HALF_OPEN to allow one probe
        state.state = "HALF_OPEN";
        state.lastStateChange = now;
        return false;
      }

      return true;
    }

    // HALF_OPEN: allow the probe through
    return false;
  }

  getState(provider: string): CircuitBreakerStats {
    const state = this.getOrCreate(provider);

    // Prune stale failures for accurate count
    this.pruneWindow(state, Date.now());

    return {
      state: state.state,
      failures: state.failures.length,
      lastFailure: state.lastFailure,
      lastStateChange: state.lastStateChange,
    };
  }

  private getOrCreate(provider: string): ProviderState {
    let state = this.providers.get(provider);
    if (!state) {
      state = {
        state: "CLOSED",
        failures: [],
        lastFailure: null,
        lastStateChange: Date.now(),
        successCount: 0,
      };
      this.providers.set(provider, state);
    }
    return state;
  }

  private pruneWindow(state: ProviderState, now: number): void {
    const windowMs = this.config.windowSeconds * 1000;
    const cutoff = now - windowMs;
    state.failures = state.failures.filter((ts) => ts > cutoff);
  }
}
