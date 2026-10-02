// Records live tomorrow.io / sunrise-sunset responses to test/fixtures/recorded/
// so you can compare them against the synthetic fixtures the tests use.
//
//   TOMORROW_API_KEY=... node scripts/record-fixtures.js 32.7473 -97.0945 America/Chicago

const fs = require("fs");
const path = require("path");

const [lat = "32.7473", lon = "-97.0945", tz = "America/Chicago"] = process.argv.slice(2);
const apiKey = process.env.TOMORROW_API_KEY;
if (!apiKey) {
  console.error("TOMORROW_API_KEY is not set");
  process.exit(1);
}

const outDir = path.join(__dirname, "../test/fixtures/recorded");
fs.mkdirSync(outDir, { recursive: true });

// Wrap fetch so we capture the raw upstream JSON, not our parsed version.
const recordingFetch = (name) => async (url) => {
  const res = await fetch(url);
  const text = await res.text();
  fs.writeFileSync(path.join(outDir, `${name}.json`), text);
  console.log(`${name}: HTTP ${res.status}`);
  return new Response(text, { status: res.status });
};

(async () => {
  const { fetchCurrentAndHourly, fetchDaily } = require("../src/tomorrow");
  const { fetchSun } = require("../src/sun");
  const params = { lat, lon, tz, apiKey };
  await fetchCurrentAndHourly({ ...params, fetchImpl: recordingFetch("current-hourly") });
  await fetchDaily({ ...params, fetchImpl: recordingFetch("daily") });
  await fetchSun({ lat, lon, fetchImpl: recordingFetch("sun") });
  console.log(`wrote ${outDir}`);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
