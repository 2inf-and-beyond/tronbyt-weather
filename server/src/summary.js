// Shapes raw tomorrow.io + sunrise-sunset data into the compact JSON the
// Pixlet app renders. Pure function: no I/O, so it's easy to test.

const { convertTemp, convertSpeed } = require("./conversions");
const { parseWeatherCode, isDaylight } = require("./weatherCodes");

const HOURLY_COUNT = 12;
const DAILY_COUNT = 5;

/**
 * Formats a timestamp as a short clock label, e.g. "2p" / "6:58a" (12h) or
 * "14" / "06:58" (24h).
 */
function clockLabel(iso, tz, clock, withMinutes) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: clock === "24" ? "2-digit" : "numeric",
    minute: withMinutes ? "2-digit" : undefined,
    hourCycle: clock === "24" ? "h23" : "h12",
  }).formatToParts(new Date(iso));
  const part = (type) => parts.find((p) => p.type === type)?.value ?? "";

  let label = part("hour");
  if (withMinutes) label += `:${part("minute")}`;
  if (clock !== "24") label += part("dayPeriod").charAt(0).toLowerCase();
  return label;
}

function weekday(iso, tz) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(
    new Date(iso)
  );
}

/**
 * @param {Object} params
 * @param {Object} params.current tomorrow.io current interval
 * @param {Array} params.hourly tomorrow.io 1h intervals
 * @param {Array} params.daily tomorrow.io 1d intervals
 * @param {{sunrise: string, sunset: string}|null} params.sun
 * @param {"imperial"|"metric"} params.units
 * @param {"12"|"24"} params.clock
 * @param {string} params.tz IANA timezone
 * @param {Date} params.now
 */
function buildSummary({ current, hourly, daily, sun, units, clock, tz, now }) {
  const cur = current.values;
  const isDay = sun ? isDaylight(now, sun.sunrise, sun.sunset) : true;
  const { desc, icon } = parseWeatherCode(cur.weatherCode, isDay);

  return {
    units,
    current: {
      temp: convertTemp(cur.temperature, units),
      code: cur.weatherCode,
      icon,
      desc,
      wind: convertSpeed(cur.windSpeed, units),
      humidity: Math.round(cur.humidity),
      cloudCover: Math.round(cur.cloudCover),
      precipProb: Math.round(cur.precipitationProbability),
      isDay,
    },
    hourly: hourly.slice(0, HOURLY_COUNT).map(({ startTime, values }) => ({
      t: clockLabel(startTime, tz, clock, false),
      temp: convertTemp(values.temperature, units),
      precipProb: Math.round(values.precipitationProbability),
    })),
    daily: daily.slice(0, DAILY_COUNT).map(({ startTime, values }) => {
      // Fall back to `temperature` in case the daily timestep doesn't return Max/Min.
      const code = values.weatherCode ?? values.weatherCodeMax;
      return {
        dow: weekday(startTime, tz),
        hi: convertTemp(values.temperatureMax ?? values.temperature, units),
        lo: convertTemp(values.temperatureMin ?? values.temperature, units),
        precipProb: Math.round(values.precipitationProbability),
        code,
        icon: parseWeatherCode(code, true).icon,
      };
    }),
    sun: sun
      ? {
          rise: clockLabel(sun.sunrise, tz, clock, true),
          set: clockLabel(sun.sunset, tz, clock, true),
        }
      : null,
    updated: now.toISOString(),
  };
}

module.exports = { buildSummary, clockLabel };
