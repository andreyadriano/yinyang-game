// Token buckets: a bucket holds up to `capacity` tokens and gets `refillPerSecond` more every second.
// Every use takes one; with an empty bucket the use is refused. A burst up to the capacity is
// allowed, but the average rate cannot go above the refill rate.
export class TokenBucket {
  constructor({ capacity, refillPerSecond, now = Date.now }) {
    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.now = now;
    this.tokens = capacity;
    this.last = now();
  }

  // True when there was a token to take.
  take() {
    const now = this.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((now - this.last) / 1000) * this.refillPerSecond);
    this.last = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

// One bucket per key (an IP address, for example), forgetting the least recently used keys so the
// memory stays bounded however many different keys show up.
export class KeyedRateLimiter {
  constructor({ capacity, refillPerSecond, maxKeys = 10_000, now = Date.now }) {
    this.options = { capacity, refillPerSecond, now };
    this.maxKeys = maxKeys;
    this.buckets = new Map();
  }

  // True when `key` may go ahead.
  allow(key) {
    let bucket = this.buckets.get(key);
    if (bucket) {
      this.buckets.delete(key); // re-inserted below: the Map keeps keys in order of use
    } else {
      bucket = new TokenBucket(this.options);
      if (this.buckets.size >= this.maxKeys) this.buckets.delete(this.buckets.keys().next().value);
    }
    this.buckets.set(key, bucket);
    return bucket.take();
  }
}
