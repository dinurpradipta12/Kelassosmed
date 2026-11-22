export const dynamic = "force-dynamic";

export type WeatherIconKey =
  | "sun"
  | "moon"
  | "partly-cloudy-day"
  | "partly-cloudy-night"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "storm"
  | "snow";

export type LocationResolutionSource = "gps" | "header" | "ip" | "timezone";

export interface WeatherLocationPayload {
  city: string;
  region: string;
  country: string;
  label: string;
  source: LocationResolutionSource;
}

export interface CurrentWeatherPayload {
  temperatureC: number;
  feelsLikeC: number;
  humidityPct: number;
  windKmh: number;
  weatherCode: number;
  condition: string;
  icon: WeatherIconKey;
  isDay: boolean;
}

export interface WeatherApiResponse {
  ok: boolean;
  location: WeatherLocationPayload;
  timezone: string;
  weather: CurrentWeatherPayload | null;
  fetchedAt: string;
}

interface ResolvedGeoCandidate {
  lat: number;
  lon: number;
  city: string;
  region: string;
  country: string;
  timezone?: string;
  source: LocationResolutionSource;
}

const TIMEZONE_FALLBACK_COORDS: Record<
  string,
  { lat: number; lon: number; city: string; region: string; country: string }
> = {
  "Asia/Jakarta": {
    lat: -6.21,
    lon: 106.85,
    city: "Jakarta",
    region: "DKI Jakarta",
    country: "Indonesia",
  },
  "Asia/Pontianak": {
    lat: -0.03,
    lon: 109.33,
    city: "Pontianak",
    region: "Kalimantan Barat",
    country: "Indonesia",
  },
  "Asia/Makassar": {
    lat: -8.65,
    lon: 115.22,
    city: "Denpasar / Makassar",
    region: "WITA",
    country: "Indonesia",
  },
  "Asia/Ujung_Pandang": {
    lat: -5.14,
    lon: 119.43,
    city: "Makassar",
    region: "Sulawesi Selatan",
    country: "Indonesia",
  },
  "Asia/Jayapura": {
    lat: -2.53,
    lon: 140.72,
    city: "Jayapura",
    region: "Papua",
    country: "Indonesia",
  },
  "Asia/Singapore": {
    lat: 1.35,
    lon: 103.82,
    city: "Singapura",
    region: "",
    country: "Singapura",
  },
  "Asia/Kuala_Lumpur": {
    lat: 3.14,
    lon: 101.69,
    city: "Kuala Lumpur",
    region: "",
    country: "Malaysia",
  },
  "Asia/Tokyo": {
    lat: 35.68,
    lon: 139.77,
    city: "Tokyo",
    region: "",
    country: "Jepang",
  },
  "Australia/Sydney": {
    lat: -33.87,
    lon: 151.21,
    city: "Sydney",
    region: "NSW",
    country: "Australia",
  },
  "Europe/London": {
    lat: 51.51,
    lon: -0.13,
    city: "London",
    region: "",
    country: "UK",
  },
  "America/New_York": {
    lat: 40.71,
    lon: -74.01,
    city: "New York",
    region: "NY",
    country: "AS",
  },
};

function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseFiniteCoord(raw: string | null, min: number, max: number): number | null {
  if (!raw || !raw.trim()) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num < min || num > max) return null;
  return roundCoord(num);
}

function safeDecodeHeader(raw: string | null): string {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

function formatLocationLabel(city: string, region: string, country: string): string {
  const c = city.trim();
  const r = region.trim();
  const co = country.trim();
  const parts: string[] = [];
  if (c) parts.push(c);
  if (r && r.toLowerCase() !== c.toLowerCase()) parts.push(r);
  if (parts.length === 0 && co) parts.push(co);
  return parts.join(", ") || "Lokasi Terdeteksi";
}

function isPrivateOrLocalIp(ip: string): boolean {
  const clean = ip.trim().toLowerCase().replace(/^::ffff:/, "");
  if (!clean || clean === "::1" || clean === "localhost") return true;
  if (clean.startsWith("127.") || clean.startsWith("10.") || clean.startsWith("192.168.")) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(clean)) return true;
  if (clean.startsWith("fe80:") || clean.startsWith("fc") || clean.startsWith("fd")) {
    return true;
  }
  return false;
}

function extractClientIp(headers: Headers): string {
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) return cfIp.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();

  return "";
}

function mapWmoWeatherCode(
  code: number,
  isDay: boolean
): { condition: string; icon: WeatherIconKey } {
  if (code === 0) {
    return {
      condition: isDay ? "Cerah" : "Cerah Malam",
      icon: isDay ? "sun" : "moon",
    };
  }
  if (code === 1 || code === 2) {
    return {
      condition: "Cerah Berawan",
      icon: isDay ? "partly-cloudy-day" : "partly-cloudy-night",
    };
  }
  if (code === 3) {
    return { condition: "Berawan", icon: "cloud" };
  }
  if (code === 45 || code === 48) {
    return { condition: "Berkabut", icon: "fog" };
  }
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) {
    return { condition: "Gerimis", icon: "drizzle" };
  }
  if (code === 61 || code === 80) {
    return { condition: "Hujan Ringan", icon: "rain" };
  }
  if (code === 63 || code === 81 || code === 66) {
    return { condition: "Hujan Sedang", icon: "rain" };
  }
  if (code === 65 || code === 67 || code === 82) {
    return { condition: "Hujan Deras", icon: "rain" };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { condition: "Salju", icon: "snow" };
  }
  if (code === 95 || code === 96 || code === 99) {
    return { condition: "Badai Petir", icon: "storm" };
  }
  return { condition: "Berawan", icon: "cloud" };
}

async function fetchReverseGeocode(
  lat: number,
  lon: number
): Promise<{ city: string; region: string; country: string } | null> {
  try {
    const geoUrl = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
    geoUrl.searchParams.set("latitude", String(lat));
    geoUrl.searchParams.set("longitude", String(lon));
    geoUrl.searchParams.set("localityLanguage", "id");

    const res = await fetch(geoUrl.toString(), {
      signal: AbortSignal.timeout(3500),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };
    const city = String(data.city || data.locality || data.principalSubdivision || "").trim();
    const region = String(data.principalSubdivision || "").trim();
    const country = String(data.countryName || "").trim();
    if (!city && !region && !country) return null;
    return { city, region, country };
  } catch {
    return null;
  }
}

async function fetchIpGeo(ip: string): Promise<ResolvedGeoCandidate | null> {
  const cleanIp = ip.trim();
  const useExplicitIp = Boolean(cleanIp) && !isPrivateOrLocalIp(cleanIp);

  // 1) Primary: GeoJS (tanpa API key, cepat & mendukung lookup per-IP atau IP caller)
  try {
    const geoJsUrl = useExplicitIp
      ? `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(cleanIp)}.json`
      : "https://get.geojs.io/v1/ip/geo.json";
    const res = await fetch(geoJsUrl, {
      signal: AbortSignal.timeout(3500),
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        latitude?: string | number;
        longitude?: string | number;
        city?: string;
        region?: string;
        country?: string;
        timezone?: string;
      };
      const lat = parseFiniteCoord(String(data.latitude ?? ""), -90, 90);
      const lon = parseFiniteCoord(String(data.longitude ?? ""), -180, 180);
      if (lat !== null && lon !== null) {
        return {
          lat,
          lon,
          city: String(data.city || "").trim(),
          region: String(data.region || "").trim(),
          country: String(data.country || "").trim(),
          timezone: typeof data.timezone === "string" ? data.timezone.trim() : undefined,
          source: "ip",
        };
      }
    }
  } catch {}

  // 2) Fallback: ipwho.is
  try {
    const ipWhoUrl = useExplicitIp
      ? `https://ipwho.is/${encodeURIComponent(cleanIp)}`
      : "https://ipwho.is/";
    const res = await fetch(ipWhoUrl, {
      signal: AbortSignal.timeout(3500),
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        success?: boolean;
        latitude?: number;
        longitude?: number;
        city?: string;
        region?: string;
        country?: string;
        timezone?: { id?: string };
      };
      if (data.success !== false) {
        const lat = parseFiniteCoord(String(data.latitude ?? ""), -90, 90);
        const lon = parseFiniteCoord(String(data.longitude ?? ""), -180, 180);
        if (lat !== null && lon !== null) {
          return {
            lat,
            lon,
            city: String(data.city || "").trim(),
            region: String(data.region || "").trim(),
            country: String(data.country || "").trim(),
            timezone: data.timezone?.id?.trim(),
            source: "ip",
          };
        }
      }
    }
  } catch {}

  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const reqHeaders = request.headers;

  const queryLat = parseFiniteCoord(searchParams.get("lat"), -90, 90);
  const queryLon = parseFiniteCoord(searchParams.get("lon"), -180, 180);
  const queryCity = (searchParams.get("city") || "").trim();
  const queryRegion = (searchParams.get("region") || "").trim();
  const queryTz = (searchParams.get("tz") || "").trim();
  const querySource: LocationResolutionSource =
    searchParams.get("source") === "ip" ? "ip" : "gps";

  let resolved: ResolvedGeoCandidate | null = null;

  // 1. Koordinat eksplisit dari query string (GPS browser atau IP fallback client)
  if (queryLat !== null && queryLon !== null) {
    let city = queryCity;
    let region = queryRegion;
    let country = "";
    if (!city) {
      const rev = await fetchReverseGeocode(queryLat, queryLon);
      if (rev) {
        city = rev.city;
        region = rev.region;
        country = rev.country;
      }
    }
    resolved = {
      lat: queryLat,
      lon: queryLon,
      city,
      region,
      country,
      timezone: queryTz || undefined,
      source: querySource,
    };
  }

  // 2. Proxy Geo Headers (Vercel / Cloudflare)
  if (!resolved) {
    const headerLat = parseFiniteCoord(
      reqHeaders.get("x-vercel-ip-latitude") || reqHeaders.get("cf-iplatitude"),
      -90,
      90
    );
    const headerLon = parseFiniteCoord(
      reqHeaders.get("x-vercel-ip-longitude") || reqHeaders.get("cf-iplongitude"),
      -180,
      180
    );
    if (headerLat !== null && headerLon !== null) {
      resolved = {
        lat: headerLat,
        lon: headerLon,
        city: safeDecodeHeader(
          reqHeaders.get("x-vercel-ip-city") || reqHeaders.get("cf-ipcity")
        ),
        region: safeDecodeHeader(
          reqHeaders.get("x-vercel-ip-country-region") || reqHeaders.get("cf-region")
        ),
        country: safeDecodeHeader(
          reqHeaders.get("x-vercel-ip-country") || reqHeaders.get("cf-ipcountry")
        ),
        timezone: safeDecodeHeader(
          reqHeaders.get("x-vercel-ip-timezone") || reqHeaders.get("cf-timezone")
        ) || undefined,
        source: "header",
      };
    }
  }

  // 3. IP Geolocation dari header client IP
  if (!resolved) {
    const clientIp = extractClientIp(reqHeaders);
    resolved = await fetchIpGeo(clientIp);
  }

  // 4. Fallback berbasis Timezone IANA browser
  if (!resolved) {
    const tzEntry =
      (queryTz && TIMEZONE_FALLBACK_COORDS[queryTz]) ||
      TIMEZONE_FALLBACK_COORDS["Asia/Jakarta"];
    resolved = {
      lat: tzEntry.lat,
      lon: tzEntry.lon,
      city: tzEntry.city,
      region: tzEntry.region,
      country: tzEntry.country,
      timezone: queryTz || "Asia/Jakarta",
      source: "timezone",
    };
  }

  const locationPayload: WeatherLocationPayload = {
    city: resolved.city,
    region: resolved.region,
    country: resolved.country,
    label: formatLocationLabel(resolved.city, resolved.region, resolved.country),
    source: resolved.source,
  };

  let resolvedTimezone = queryTz || resolved.timezone || "Asia/Jakarta";
  let weatherPayload: CurrentWeatherPayload | null = null;
  let ok = false;

  try {
    const meteoUrl = new URL("https://api.open-meteo.com/v1/forecast");
    meteoUrl.searchParams.set("latitude", String(resolved.lat));
    meteoUrl.searchParams.set("longitude", String(resolved.lon));
    meteoUrl.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m"
    );
    meteoUrl.searchParams.set("timezone", "auto");

    const meteoRes = await fetch(meteoUrl.toString(), {
      signal: AbortSignal.timeout(4500),
      headers: { Accept: "application/json" },
    });

    if (meteoRes.ok) {
      const meteoData = (await meteoRes.json()) as {
        timezone?: string;
        current?: {
          temperature_2m?: number;
          apparent_temperature?: number;
          relative_humidity_2m?: number;
          weather_code?: number;
          is_day?: number;
          wind_speed_10m?: number;
        };
      };

      if (meteoData.timezone && !queryTz) {
        resolvedTimezone = meteoData.timezone;
      }

      if (meteoData.current && typeof meteoData.current.temperature_2m === "number") {
        const isDay = meteoData.current.is_day !== 0;
        const code = Number(meteoData.current.weather_code ?? 0);
        const mapped = mapWmoWeatherCode(code, isDay);
        weatherPayload = {
          temperatureC: Math.round(meteoData.current.temperature_2m),
          feelsLikeC: Math.round(
            Number(meteoData.current.apparent_temperature ?? meteoData.current.temperature_2m)
          ),
          humidityPct: Math.round(Number(meteoData.current.relative_humidity_2m ?? 0)),
          windKmh: Math.round(Number(meteoData.current.wind_speed_10m ?? 0)),
          weatherCode: code,
          condition: mapped.condition,
          icon: mapped.icon,
          isDay,
        };
        ok = true;
      }
    }
  } catch {
    ok = false;
  }

  const body: WeatherApiResponse = {
    ok,
    location: locationPayload,
    timezone: resolvedTimezone,
    weather: weatherPayload,
    fetchedAt: new Date().toISOString(),
  };

  return Response.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=180",
    },
  });
}
