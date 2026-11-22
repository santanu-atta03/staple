const EventEmitter = require("events");
const logger = require("pino")();

class MockRedis extends EventEmitter {
  constructor() {
    super();
    this.store = new Map();
    this.sets = new Map();
    this.lists = new Map();
    setTimeout(() => this.emit("connect"), 20);
  }

  async ping() {
    return "PONG";
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async set(key, value, mode, duration) {
    this.store.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    return "OK";
  }

  async del(...keys) {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
      this.sets.delete(key);
      this.lists.delete(key);
    }
    return count;
  }

  async incr(key) {
    const val = parseInt(this.store.get(key) || "0", 10) + 1;
    this.store.set(key, String(val));
    return val;
  }

  async sadd(key, ...members) {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    const set = this.sets.get(key);
    let added = 0;
    for (const m of members) {
      if (!set.has(String(m))) {
        set.add(String(m));
        added++;
      }
    }
    return added;
  }

  async sismember(key, member) {
    const set = this.sets.get(key);
    return set && set.has(String(member)) ? 1 : 0;
  }

  async scard(key) {
    const set = this.sets.get(key);
    return set ? set.size : 0;
  }

  async exists(key) {
    return this.store.has(key) || this.sets.has(key) || this.lists.has(key) ? 1 : 0;
  }

  async lrange(key, start, stop) {
    const list = this.lists.get(key) || [];
    if (stop === -1) return list.slice(start);
    return list.slice(start, stop + 1);
  }

  async rpush(key, ...values) {
    if (!this.lists.has(key)) this.lists.set(key, []);
    this.lists.get(key).push(...values.map(String));
    return this.lists.get(key).length;
  }

  async lpush(key, ...values) {
    if (!this.lists.has(key)) this.lists.set(key, []);
    this.lists.get(key).unshift(...values.map(String));
    return this.lists.get(key).length;
  }

  async ltrim(key, start, stop) {
    const list = this.lists.get(key) || [];
    const trimmed = stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
    this.lists.set(key, trimmed);
    return "OK";
  }

  async expire() {
    return 1;
  }

  async quit() {
    return "OK";
  }

  pipeline() {
    const ops = [];
    const p = {
      exists: (k) => { ops.push(async () => [null, await this.exists(k)]); return p; },
      sismember: (k, m) => { ops.push(async () => [null, await this.sismember(k, m)]); return p; },
      scard: (k) => { ops.push(async () => [null, await this.scard(k)]); return p; },
      get: (k) => { ops.push(async () => [null, await this.get(k)]); return p; },
      lpush: (k, v) => { ops.push(async () => [null, await this.lpush(k, v)]); return p; },
      ltrim: (k, s, e) => { ops.push(async () => [null, await this.ltrim(k, s, e)]); return p; },
      expire: (k, s) => { ops.push(async () => [null, await this.expire(k, s)]); return p; },
      exec: async () => {
        const results = [];
        for (const op of ops) {
          results.push(await op());
        }
        return results;
      },
    };
    return p;
  }
}

const mock = new MockRedis();
module.exports = mock;
