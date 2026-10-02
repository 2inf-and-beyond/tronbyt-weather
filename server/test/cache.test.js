const test = require("node:test");
const assert = require("node:assert/strict");
const { TtlCache } = require("../src/cache");

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

test("serves cached value within TTL", async () => {
  const c = clock();
  const cache = new TtlCache({ now: c.now });
  let calls = 0;
  const loader = async () => ++calls;

  assert.deepEqual(await cache.get("k", 1000, loader), { value: 1, stale: false });
  c.advance(999);
  assert.deepEqual(await cache.get("k", 1000, loader), { value: 1, stale: false });
  c.advance(1);
  assert.deepEqual(await cache.get("k", 1000, loader), { value: 2, stale: false });
});

test("concurrent misses share one load", async () => {
  const cache = new TtlCache();
  let calls = 0;
  const loader = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 10));
    return "v";
  };
  await Promise.all([cache.get("k", 1000, loader), cache.get("k", 1000, loader)]);
  assert.equal(calls, 1);
});

test("serves stale value when refresh fails", async () => {
  const c = clock();
  const cache = new TtlCache({ now: c.now });
  await cache.get("k", 1000, async () => "old");
  c.advance(2000);
  const result = await cache.get("k", 1000, async () => {
    throw new Error("upstream down");
  });
  assert.deepEqual(result, { value: "old", stale: true });
});

test("throws when nothing cached and load fails", async () => {
  const cache = new TtlCache();
  await assert.rejects(
    cache.get("k", 1000, async () => {
      throw new Error("upstream down");
    }),
    /upstream down/
  );
});
