"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  LocateFixed,
  MapPin,
  Moon,
  RefreshCw,
  Snowflake,
  Sun,
} from "lucide-react";
import type { WeatherApiResponse, WeatherIconKey } from "@/app/api/weather/route";

interface LiveLocalWeatherBarProps {
  onHourChange?: (hour24: number) => void;
}

interface SessionGpsCoords {
  lat: number;
  lon: number;
}

const SESSION_GPS_KEY = "rs_weather_gps_v1";
const WEATHER_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

function roundCityCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

function createDeadlineSignal(
  parentSignal: AbortSignal,
  timeoutMs: number
): { signal: AbortSignal; cleanup: () => void } {
  if (
    typeof AbortSignal !== "undefined" &&
    "any" in AbortSignal &&
    "timeout" in AbortSignal
  ) {
    return {
      signal: AbortSignal.any([parentSignal, AbortSignal.timeout(timeoutMs)]),
      cleanup: () => {},
    };
  }
  const inner = new AbortController();
  const onParentAbort = () => inner.abort(parentSignal.reason);
  if (parentSignal.aborted) {
    inner.abort(parentSignal.reason);
  } else {
    parentSignal.addEventListener("abort", onParentAbort, { once: true });
  }
  const timer = window.setTimeout(() => inner.abort(), timeoutMs);
  return {
    signal: inner.signal,
    cleanup: () => {
      window.clearTimeout(timer);
      parentSignal.removeEventListener("abort", onParentAbort);
    },
  };
}

function getTimezoneShortLabel(tz: string, date: Date): string {
  const clean = tz.trim();
  if (clean === "Asia/Jakarta" || clean === "Asia/Pontianak") return "WIB";
  if (clean === "Asia/Makassar" || clean === "Asia/Ujung_Pandang") return "WITA";
  if (clean === "Asia/Jayapura") return "WIT";

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: clean,
      timeZoneName: "short",
    }).formatToParts(date);
    const tzPart = parts.find((p) => p.type === "timeZoneName")?.value;
    if (tzPart) return tzPart;
  } catch {}
  return clean.split("/").pop()?.replace(/_/g, " ") || "Lokal";
}

function renderWeatherIcon(icon: WeatherIconKey) {
  switch (icon) {
    case "sun":
      return <Sun size={13} className="text-amber-500 shrink-0" aria-hidden="true" />;
    case "moon":
      return <Moon size={13} className="text-indigo-500 shrink-0" aria-hidden="true" />;
    case "partly-cloudy-day":
      return <CloudSun size={13} className="text-amber-500 shrink-0" aria-hidden="true" />;
    case "partly-cloudy-night":
      return <CloudMoon size={13} className="text-indigo-500 shrink-0" aria-hidden="true" />;
    case "fog":
      return <CloudFog size={13} className="text-slate-500 shrink-0" aria-hidden="true" />;
    case "drizzle":
      return <CloudDrizzle size={13} className="text-sky-500 shrink-0" aria-hidden="true" />;
    case "rain":
      return <CloudRain size={13} className="text-blue-600 shrink-0" aria-hidden="true" />;
    case "storm":
      return <CloudLightning size={13} className="text-violet-600 shrink-0" aria-hidden="true" />;
    case "snow":
      return <Snowflake size={13} className="text-cyan-500 shrink-0" aria-hidden="true" />;
    case "cloud":
    default:
      return <Cloud size={13} className="text-slate-500 shrink-0" aria-hidden="true" />;
  }
}

function readSessionGpsCoords(): SessionGpsCoords | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_GPS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionGpsCoords>;
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lon === "number" &&
      Number.isFinite(parsed.lat) &&
      Number.isFinite(parsed.lon)
    ) {
      return {
        lat: roundCityCoord(parsed.lat),
        lon: roundCityCoord(parsed.lon),
      };
    }
  } catch {}
  return null;
}

export function LiveLocalWeatherBar({ onHourChange }: LiveLocalWeatherBarProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [browserTz, setBrowserTz] = useState<string>("Asia/Jakarta");
  const [weatherData, setWeatherData] = useState<WeatherApiResponse | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(true);
  const [locatingGps, setLocatingGps] = useState<boolean>(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);

  const lastReportedHourRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeTz = browserTz || weatherData?.timezone || "Asia/Jakarta";

  // 1. Live 1-second local clock anchored strictly after client mount (avoids SSR hydration drift)
  useEffect(() => {
    try {
      const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (resolved) setBrowserTz(resolved);
    } catch {}

    setNow(new Date());
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Sync greeting hour dynamically if user stays open across morning/afternoon/evening transitions
  useEffect(() => {
    if (!now || !onHourChange) return;
    try {
      const hourStr = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        hour12: false,
        timeZone: activeTz,
      }).format(now);
      const hourNum = Number(hourStr) % 24;
      if (Number.isFinite(hourNum) && hourNum !== lastReportedHourRef.current) {
        lastReportedHourRef.current = hourNum;
        onHourChange(hourNum);
      }
    } catch {}
  }, [now, activeTz, onHourChange]);

  const loadWeather = useCallback(
    async (opts?: {
      coords?: SessionGpsCoords | null;
      city?: string;
      region?: string;
      source?: "gps" | "ip";
      silent?: boolean;
    }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!opts?.silent) {
        setLoadingWeather(true);
      }

      const tzParam = (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone || browserTz;
        } catch {
          return browserTz;
        }
      })();

      const sessionCoords =
        opts?.coords !== undefined ? opts.coords : readSessionGpsCoords();

      const buildApiUrl = (extra?: {
        lat?: number;
        lon?: number;
        city?: string;
        region?: string;
        source?: "gps" | "ip";
      }) => {
        const endpoint = new URL("/api/weather", window.location.origin);
        if (tzParam) endpoint.searchParams.set("tz", tzParam);
        const lat = extra?.lat ?? sessionCoords?.lat;
        const lon = extra?.lon ?? sessionCoords?.lon;
        if (typeof lat === "number" && typeof lon === "number") {
          endpoint.searchParams.set("lat", String(roundCityCoord(lat)));
          endpoint.searchParams.set("lon", String(roundCityCoord(lon)));
          endpoint.searchParams.set("source", extra?.source || opts?.source || "gps");
        }
        if (extra?.city || opts?.city) {
          endpoint.searchParams.set("city", extra?.city || opts?.city || "");
        }
        if (extra?.region || opts?.region) {
          endpoint.searchParams.set("region", extra?.region || opts?.region || "");
        }
        return endpoint.toString();
      };

      const { signal, cleanup } = createDeadlineSignal(controller.signal, 8000);
      try {
        const res = await fetch(buildApiUrl(), {
          signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        let payload = (await res.json()) as WeatherApiResponse;

        // If server proxy headers/local server couldn't infer public IP, ask browser IP-geo once
        if (
          !sessionCoords &&
          payload?.location?.source === "timezone" &&
          !controller.signal.aborted
        ) {
          const { signal: ipSig, cleanup: cleanIp } = createDeadlineSignal(
            controller.signal,
            4000
          );
          try {
            const geoRes = await fetch("https://get.geojs.io/v1/ip/geo.json", {
              signal: ipSig,
            });
            if (geoRes.ok) {
              const geo = (await geoRes.json()) as {
                latitude?: string | number;
                longitude?: string | number;
                city?: string;
                region?: string;
              };
              const ipLat = Number(geo.latitude);
              const ipLon = Number(geo.longitude);
              if (Number.isFinite(ipLat) && Number.isFinite(ipLon)) {
                const refinedRes = await fetch(
                  buildApiUrl({
                    lat: ipLat,
                    lon: ipLon,
                    city: geo.city,
                    region: geo.region,
                    source: "ip",
                  }),
                  { signal, cache: "no-store" }
                );
                if (refinedRes.ok) {
                  payload = (await refinedRes.json()) as WeatherApiResponse;
                }
              }
            }
          } catch {
            // Keep timezone-based weather gracefully
          } finally {
            cleanIp();
          }
        }

        if (!controller.signal.aborted) {
          setWeatherData(payload);
        }
      } catch {
        // Keep existing weather or show clock cleanly
      } finally {
        cleanup();
        if (!controller.signal.aborted) {
          setLoadingWeather(false);
        }
      }
    },
    [browserTz]
  );

  // Initial weather load + 10-minute background refresh (paused when tab hidden)
  useEffect(() => {
    void loadWeather();
    const interval = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void loadWeather({ silent: true });
    }, WEATHER_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [loadWeather]);

  const handleRequestGpsLocation = () => {
    setLocationHint(null);
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      void loadWeather();
      return;
    }

    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: SessionGpsCoords = {
          lat: roundCityCoord(pos.coords.latitude),
          lon: roundCityCoord(pos.coords.longitude),
        };
        try {
          window.sessionStorage.setItem(SESSION_GPS_KEY, JSON.stringify(coords));
        } catch {}
        setLocatingGps(false);
        void loadWeather({ coords, source: "gps" });
      },
      (err) => {
        setLocatingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationHint("Izin lokasi GPS ditolak — memakai lokasi IP/zona waktu");
        } else {
          setLocationHint("Gagal memuat GPS — memperbarui dari lokasi jaringan");
        }
        void loadWeather({ silent: true });
        window.setTimeout(() => setLocationHint(null), 4500);
      },
      {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 300_000,
      }
    );
  };

  const formattedClock = useMemo(() => {
    if (!now) return "--:--:--";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: activeTz,
      })
        .format(now)
        .replace(/\./g, ":");
    } catch {
      return "--:--:--";
    }
  }, [now, activeTz]);

  const formattedDate = useMemo(() => {
    if (!now) return "";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: activeTz,
      }).format(now);
    } catch {
      return "";
    }
  }, [now, activeTz]);

  const tzShortLabel = useMemo(() => {
    if (!now) return "WIB";
    return getTimezoneShortLabel(activeTz, now);
  }, [activeTz, now]);

  const weather = weatherData?.weather ?? null;
  const locationLabel =
    weatherData?.location?.label ||
    activeTz.split("/").pop()?.replace(/_/g, " ") ||
    "Jakarta";

  const weatherTooltip = weather
    ? `Terasa seperti ${weather.feelsLikeC}°C • Kelembapan ${weather.humidityPct}% • Angin ${weather.windKmh} km/jam`
    : "Cuaca realtime lokal";

  return (
    <div className="mt-2 space-y-1">
      <div
        className="flex flex-wrap items-center gap-1.5 sm:gap-2"
        aria-label="Waktu, cuaca, dan lokasi realtime Anda"
      >
        {/* 1. Realtime Local Clock + Timezone + Short Date */}
        <div
          className="inline-flex items-center gap-1.5 rounded-full bg-white/95 border border-[#EAECEF] px-2.5 py-1 text-[11px] font-semibold text-[#475569] shadow-2xs"
          title={`Zona waktu aktif: ${activeTz}`}
        >
          <Clock size={12} className="text-[#4F39F6] shrink-0" aria-hidden="true" />
          <span className="font-extrabold text-[#121215] tabular-nums tracking-tight">
            {formattedClock}
          </span>
          <span className="rounded bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-extrabold text-[#4F39F6]">
            {tzShortLabel}
          </span>
          {formattedDate && (
            <span className="hidden sm:inline text-[#64748B]">
              • {formattedDate}
            </span>
          )}
        </div>

        {/* 2. Realtime Weather Condition + Temperature */}
        {loadingWeather && !weather ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-[#EAECEF] px-2.5 py-1 text-[11px] text-[#64748B]">
            <RefreshCw size={11} className="animate-spin text-[#0EA5E9]" />
            <span>Memuat cuaca...</span>
          </div>
        ) : weather ? (
          <div
            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 border border-[#EAECEF] px-2.5 py-1 text-[11px] font-semibold text-[#475569] shadow-2xs"
            title={weatherTooltip}
          >
            {renderWeatherIcon(weather.icon)}
            <span className="font-extrabold text-[#121215] tabular-nums">
              {weather.temperatureC}°C
            </span>
            <span className="text-[#475569]">{weather.condition}</span>
          </div>
        ) : null}

        {/* 3. Realtime Location Pill (Click for User-Initiated Precise GPS Upgrade / Refresh) */}
        <button
          type="button"
          onClick={handleRequestGpsLocation}
          disabled={locatingGps}
          aria-label={`Lokasi terdeteksi: ${locationLabel}. Klik untuk perbarui lokasi GPS dan cuaca realtime`}
          title={
            weatherData?.location?.source === "gps"
              ? "Menggunakan GPS akurat (Klik untuk perbarui)"
              : "Klik untuk gunakan lokasi GPS akurat & refresh cuaca"
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-white/95 hover:bg-white border border-[#EAECEF] hover:border-[#4F39F6]/40 px-2.5 py-1 text-[11px] font-semibold text-[#475569] hover:text-[#121215] shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
        >
          <MapPin size={12} className="text-[#10B981] shrink-0" aria-hidden="true" />
          <span className="max-w-[180px] truncate">{locationLabel}</span>
          {locatingGps || loadingWeather ? (
            <RefreshCw
              size={11}
              className="text-[#94A3B8] animate-spin shrink-0"
              aria-hidden="true"
            />
          ) : (
            <LocateFixed
              size={11}
              className={
                weatherData?.location?.source === "gps"
                  ? "text-[#10B981] shrink-0"
                  : "text-[#94A3B8] shrink-0"
              }
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      {locationHint && (
        <p className="text-[10px] font-medium text-[#64748B]" role="status">
          {locationHint}
        </p>
      )}
    </div>
  );
}
