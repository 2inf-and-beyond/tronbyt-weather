const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSummary, clockLabel } = require("../src/summary");
const { parseWeatherCode } = require("../src/weatherCodes");
const currentHourly = require("./fixtures/current-hourly.json");
const daily = require("./fixtures/daily.json");
const sun = require("./fixtures/sun.json");

const TZ = "America/Chicago";
const NOW = new Date("2026-10-01T19:30:00Z"); // 2:30pm CDT

function summary(overrides = {}) {
  const [current, hourly] = currentHourly.data.timelines;
  return buildSummary({
    current: current.intervals[0],
    hourly: hourly.intervals,
    daily: daily.data.timelines[0].intervals,
    sun: sun.results,
    units: "imperial",
    clock: "12",
    tz: TZ,
    now: NOW,
    ...overrides,
  });
}

test("current conditions convert to imperial and pick day icon", () => {
  assert.deepEqual(summary().current, {
    temp: 72,
    code: 1101,
    icon: "partly_cloudy_day",
    desc: "Partly cloudy",
    wind: 8,
    humidity: 41,
    cloudCover: 36,
    precipProb: 10,
    isDay: true,
  });
});

test("metric units pass through rounded", () => {
  const { current } = summary({ units: "metric" });
  assert.equal(current.temp, 22);
  assert.equal(current.wind, 4);
});

test("night icon after sunset", () => {
  const { current } = summary({ now: new Date("2026-10-02T03:00:00Z") });
  assert.equal(current.isDay, false);
  assert.equal(current.icon, "partly_cloudy_night");
});

test("missing sun data defaults to day and null sun", () => {
  const s = summary({ sun: null });
  assert.equal(s.current.isDay, true);
  assert.equal(s.sun, null);
});

test("hourly is capped at 12 with local hour labels", () => {
  const { hourly } = summary();
  assert.equal(hourly.length, 12);
  assert.deepEqual(hourly[0], { t: "2p", temp: 77, precipProb: 0 });
  assert.equal(hourly[10].t, "12a");
});

test("daily has 5 days with weekday, hi/lo and icon", () => {
  const { daily: days } = summary();
  assert.equal(days.length, 5);
  assert.deepEqual(days[0], { dow: "Thu", hi: 82, lo: 59, precipProb: 0, code: 1000, icon: "clear_day" });
  assert.deepEqual(
    days.map((d) => d.icon),
    ["clear_day", "rain", "snow", "thunder", "cloudy"]
  );
});

test("sun times in 12h and 24h", () => {
  assert.deepEqual(summary().sun, { rise: "7:20a", set: "7:10p" });
  assert.deepEqual(summary({ clock: "24" }).sun, { rise: "07:20", set: "19:10" });
});

test("clockLabel 24h hour only", () => {
  assert.equal(clockLabel("2026-10-01T19:00:00Z", TZ, "24", false), "14");
});

test("unknown weather code", () => {
  assert.deepEqual(parseWeatherCode(9999), { desc: "Unknown", icon: "unknown" });
});
