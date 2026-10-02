const { createApp } = require("./app");
const { TtlCache } = require("./cache");

const apiKey = process.env.TOMORROW_API_KEY;
if (!apiKey) {
  console.error("TOMORROW_API_KEY is not set");
  process.exit(1);
}

const port = Number(process.env.PORT) || 8787;
const defaultTz = process.env.TZ || "UTC";
const cache = new TtlCache({
  log: process.env.LOG_CACHE ? (msg) => console.log(msg) : undefined,
});

createApp({ apiKey, defaultTz, cache }).listen(port, () => {
  console.log(`weather-api listening on :${port} (default tz ${defaultTz})`);
});
