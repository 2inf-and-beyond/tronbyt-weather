# tronbyt-weather

Weather for a [Tronbyt](https://github.com/tronbyt/server) display. Current conditions, a 12-hour forecast, a 5-day forecast and sunrise/sunset times are ported from [pi-weather-station](https://github.com/elewin/pi-weather-station).

```
tomorrow.io ──┐
sunrise-sunset┼─> weather-api (this repo, Docker) ──JSON──> Tronbyt server ──> weather.star ──> device
```

- `server/`: a Node/Express API. It holds the tomorrow.io key, caches upstream calls, and returns compact JSON that's ready to display.
- `app/`: the Pixlet app (coming next).

## weather-api

```sh
cp .env.example .env          # add TOMORROW_API_KEY, TZ, TRONBYT_NETWORK
docker compose up -d --build
curl 'localhost:8787/v1/summary?lat=32.7473&lon=-97.0945'
```

### `GET /v1/summary`

| param   | default            | notes                          |
|---------|--------------------|--------------------------------|
| `lat`   | required           |                                |
| `lon`   | required           |                                |
| `tz`    | `$TZ`              | IANA timezone, for labels      |
| `units` | `imperial`         | `imperial` or `metric`         |
| `clock` | `12`               | `12` or `24`                   |

```json
{
  "units": "imperial",
  "current": { "temp": 72, "code": 1101, "icon": "partly_cloudy_day", "desc": "Partly cloudy",
               "wind": 8, "humidity": 41, "cloudCover": 36, "precipProb": 10, "isDay": true },
  "hourly": [{ "t": "2p", "temp": 77, "precipProb": 0 }],
  "daily": [{ "dow": "Thu", "hi": 82, "lo": 59, "precipProb": 0, "code": 1000, "icon": "clear_day" }],
  "sun": { "rise": "7:20a", "set": "7:10p" },
  "updated": "2026-10-01T19:30:00.000Z",
  "stale": false
}
```

`hourly` has 12 entries and `daily` has 5. `stale: true` means an upstream refresh failed, so cached data was served instead.

Coordinates are rounded to two decimal places (about 1 km). Current and hourly data are cached for 10 minutes, daily for 1 hour, and sun times for 3 hours. That's about 7 tomorrow.io calls per hour per location.

### Development

```sh
cd server
npm install
npm test                                   # node:test, uses synthetic fixtures (no API calls)
TOMORROW_API_KEY=... npm start
TOMORROW_API_KEY=... npm run record-fixtures -- 32.7473 -97.0945 America/Chicago
```

`record-fixtures` saves live upstream responses to `test/fixtures/recorded/`. Use it to check that the real responses match the synthetic fixtures.
