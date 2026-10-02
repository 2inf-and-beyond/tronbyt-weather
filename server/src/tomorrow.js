// Ported from update{Current,Hourly,Daily}WeatherData in pi-weather-station
// client/src/AppContext.js. Current + hourly share one request to save quota.

const BASE_URL = "https://api.tomorrow.io/v4/timelines";

const CURRENT_HOURLY_FIELDS = [
  "temperature",
  "humidity",
  "windSpeed",
  "precipitationProbability",
  "cloudCover",
  "weatherCode",
];

const DAILY_FIELDS = [
  "temperatureMax",
  "temperatureMin",
  "precipitationProbability",
  "weatherCode",
];

const HOUR_MS = 60 * 60 * 1000;

/**
 * @returns {Promise<Object<string, Array>>} intervals keyed by timestep
 */
async function getTimelines({ lat, lon, tz, apiKey, fields, timesteps, endTime, fetchImpl }) {
  const params = new URLSearchParams({
    location: `${lat},${lon}`,
    fields: fields.join(","),
    timesteps: timesteps.join(","),
    units: "metric",
    timezone: tz,
    endTime: endTime.toISOString(),
    apikey: apiKey,
  });
  const res = await fetchImpl(`${BASE_URL}?${params}`);
  if (!res.ok) {
    throw new Error(`tomorrow.io ${res.status}: ${await res.text()}`);
  }
  const body = await res.json();
  const byTimestep = {};
  for (const timeline of body?.data?.timelines ?? []) {
    byTimestep[timeline.timestep] = timeline.intervals;
  }
  return byTimestep;
}

/**
 * @returns {Promise<{current: Object, hourly: Array}>}
 */
async function fetchCurrentAndHourly({ lat, lon, tz, apiKey, now = new Date(), fetchImpl = fetch }) {
  const timelines = await getTimelines({
    lat,
    lon,
    tz,
    apiKey,
    fields: CURRENT_HOURLY_FIELDS,
    timesteps: ["current", "1h"],
    endTime: new Date(now.getTime() + 12 * HOUR_MS),
    fetchImpl,
  });
  const current = timelines.current?.[0];
  if (!current) throw new Error("tomorrow.io response missing current timeline");
  return { current, hourly: timelines["1h"] ?? [] };
}

/**
 * @returns {Promise<Array>} daily intervals
 */
async function fetchDaily({ lat, lon, tz, apiKey, now = new Date(), fetchImpl = fetch }) {
  const timelines = await getTimelines({
    lat,
    lon,
    tz,
    apiKey,
    fields: DAILY_FIELDS,
    timesteps: ["1d"],
    endTime: new Date(now.getTime() + 4 * 24 * HOUR_MS),
    fetchImpl,
  });
  return timelines["1d"] ?? [];
}

module.exports = { fetchCurrentAndHourly, fetchDaily };
