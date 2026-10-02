const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const currentHourly = require("./fixtures/current-hourly.json");
const daily = require("./fixtures/daily.json");
const sun = require("./fixtures/sun.json");

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Fake upstream that routes by URL and records requests. */
function fakeUpstream({ failTomorrow = false, failSun = false } = {}) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const u = new URL(url);
    if (u.hostname === "api.sunrise-sunset.org") {
      return failSun ? jsonResponse({}, 500) : jsonResponse(sun);
    }
    if (failTomorrow) return jsonResponse({ message: "rate limited" }, 429);
    return u.searchParams.get("timesteps") === "1d"
      ? jsonResponse(daily)
      : jsonResponse(currentHourly);
  };
  return { fetchImpl, calls };
}

async function withServer(options, fn) {
  const server = createApp({
    apiKey: "test-key",
    defaultTz: "America/Chicago",
    now: () => new Date("2026-10-01T19:30:00Z"),
    ...options,
  }).listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    await fn((path) => fetch(base + path));
  } finally {
    server.close();
  }
}

test("GET /healthz", async () => {
  await withServer(fakeUpstream(), async (get) => {
    const res = await get("/healthz");
    assert.equal(res.status, 200);
  });
});

test("GET /v1/summary returns display-ready JSON and caches upstream", async () => {
  const upstream = fakeUpstream();
  await withServer(upstream, async (get) => {
    const res = await get("/v1/summary?lat=32.7473&lon=-97.0945");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.current.temp, 72);
    assert.equal(body.hourly.length, 12);
    assert.equal(body.daily.length, 5);
    assert.deepEqual(body.sun, { rise: "7:20a", set: "7:10p" });
    assert.equal(body.stale, false);

    // Rounded coords, metric upstream, key passed through.
    const tomorrowUrl = new URL(upstream.calls.find((u) => u.includes("tomorrow.io")));
    assert.equal(tomorrowUrl.searchParams.get("location"), "32.75,-97.09");
    assert.equal(tomorrowUrl.searchParams.get("units"), "metric");
    assert.equal(tomorrowUrl.searchParams.get("timezone"), "America/Chicago");
    assert.equal(tomorrowUrl.searchParams.get("apikey"), "test-key");

    // Second request (nearby coords) is served from cache.
    await get("/v1/summary?lat=32.748&lon=-97.094&units=metric");
    assert.equal(upstream.calls.length, 3);
  });
});

test("rejects bad input", async () => {
  await withServer(fakeUpstream(), async (get) => {
    assert.equal((await get("/v1/summary?lat=abc&lon=1")).status, 400);
    assert.equal((await get("/v1/summary?lat=100&lon=1")).status, 400);
    assert.equal((await get("/v1/summary?lat=1&lon=1&tz=Not/AZone")).status, 400);
  });
});

test("502 when tomorrow.io fails with nothing cached", async () => {
  await withServer(fakeUpstream({ failTomorrow: true }), async (get) => {
    assert.equal((await get("/v1/summary?lat=1&lon=1")).status, 502);
  });
});

test("sun failure degrades gracefully", async () => {
  await withServer(fakeUpstream({ failSun: true }), async (get) => {
    const res = await get("/v1/summary?lat=1&lon=1");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.sun, null);
    assert.equal(body.stale, true);
  });
});
