const express = require("express");
const { TtlCache } = require("./cache");
const { fetchCurrentAndHourly, fetchDaily } = require("./tomorrow");
const { fetchSun } = require("./sun");
const { buildSummary } = require("./summary");

const MINUTE_MS = 60 * 1000;

// Each new location costs ~7 tomorrow.io calls/hour (current+hourly every
// 10m, daily every hour), well under the free tier's hourly and daily caps.
const TTL = {
  currentHourly: 10 * MINUTE_MS,
  daily: 60 * MINUTE_MS,
  sun: 3 * 60 * MINUTE_MS,
};

function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {Object} options
 * @param {string} options.apiKey tomorrow.io API key
 * @param {string} [options.defaultTz] used when the request has no `tz`
 * @param {typeof fetch} [options.fetchImpl]
 * @param {() => Date} [options.now]
 * @param {TtlCache} [options.cache]
 */
function createApp({
  apiKey,
  defaultTz = "UTC",
  fetchImpl = fetch,
  now = () => new Date(),
  cache = new TtlCache(),
}) {
  const app = express();

  app.get("/healthz", (req, res) => res.json({ ok: true }));

  app.get("/v1/summary", async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return res.status(400).json({ error: "lat and lon are required numbers" });
    }
    const tz = req.query.tz || defaultTz;
    if (!isValidTimeZone(tz)) {
      return res.status(400).json({ error: `unknown timezone: ${tz}` });
    }
    const units = req.query.units === "metric" ? "metric" : "imperial";
    const clock = req.query.clock === "24" ? "24" : "12";

    // ~1km precision: nearby requests share a cache entry and upstream quota.
    const rLat = lat.toFixed(2);
    const rLon = lon.toFixed(2);
    const loc = `${rLat},${rLon}`;
    const params = { lat: rLat, lon: rLon, tz, apiKey, fetchImpl };

    try {
      const [currentHourly, daily, sun] = await Promise.all([
        cache.get(`currentHourly:${loc}:${tz}`, TTL.currentHourly, () =>
          fetchCurrentAndHourly({ ...params, now: now() })
        ),
        cache.get(`daily:${loc}:${tz}`, TTL.daily, () => fetchDaily({ ...params, now: now() })),
        // Sun times are nice-to-have; don't fail the whole response without them.
        cache.get(`sun:${loc}`, TTL.sun, () => fetchSun(params)).catch((err) => {
          console.error(`sun lookup failed: ${err.message}`);
          return { value: null, stale: true };
        }),
      ]);

      const summary = buildSummary({
        current: currentHourly.value.current,
        hourly: currentHourly.value.hourly,
        daily: daily.value,
        sun: sun.value,
        units,
        clock,
        tz,
        now: now(),
      });
      summary.stale = currentHourly.stale || daily.stale || sun.stale;
      return res.json(summary);
    } catch (err) {
      console.error(`summary failed for ${loc}: ${err.message}`);
      return res.status(502).json({ error: "weather data unavailable" });
    }
  });

  return app;
}

module.exports = { createApp, TTL };
