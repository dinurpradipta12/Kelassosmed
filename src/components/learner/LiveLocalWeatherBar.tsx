"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Check,
  Clock,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  MapPin,
  Moon,
  RefreshCw,
  SlidersHorizontal,
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

type HourFormatMode = "12h" | "24h";

interface ClockPreferences {
  hourFormat: HourFormatMode;
  showSeconds: boolean;
}

const SESSION_GPS_KEY = "rs_weather_gps_v1";
const CLOCK_PREFS_STORAGE_KEY = "rs_clock_prefs_v1";
const WEATHER_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const DEFAULT_CLOCK_PREFS: ClockPreferences = {
  hourFormat: "12h",
  showSeconds: true,
};

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
      return <Sun size={14} className="text-amber-500 shrink-0" aria-hidden="true" />;
    case "moon":
      return <Moon size={14} className="text-indigo-500 shrink-0" aria-hidden="true" />;
    case "partly-cloudy-day":
      return <CloudSun size={14} className="text-amber-500 shrink-0" aria-hidden="true" />;
    case "partly-cloudy-night":
      return <CloudMoon size={14} className="text-indigo-500 shrink-0" aria-hidden="true" />;
    case "fog":
      return <CloudFog size={14} className="text-slate-500 shrink-0" aria-hidden="true" />;
    case "drizzle":
      return <CloudDrizzle size={14} className="text-sky-500 shrink-0" aria-hidden="true" />;
    case "rain":
      return <CloudRain size={14} className="text-blue-600 shrink-0" aria-hidden="true" />;
    case "storm":
      return <CloudLightning size={14} className="text-violet-600 shrink-0" aria-hidden="true" />;
    case "snow":
      return <Snowflake size={14} className="text-cyan-500 shrink-0" aria-hidden="true" />;
    case "cloud":
    default:
      return <Cloud size={14} className="text-slate-500 shrink-0" aria-hidden="true" />;
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

function readClockPreferences(): ClockPreferences {
  if (typeof window === "undefined") return DEFAULT_CLOCK_PREFS;
  try {
    const raw = window.localStorage.getItem(CLOCK_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_CLOCK_PREFS;
    const parsed = JSON.parse(raw) as Partial<ClockPreferences>;
    return {
      hourFormat: parsed.hourFormat === "24h" ? "24h" : "12h",
      showSeconds:
        typeof parsed.showSeconds === "boolean" ? parsed.showSeconds : true,
    };
  } catch {
    return DEFAULT_CLOCK_PREFS;
  }
}

function persistClockPreferences(prefs: ClockPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLOCK_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export function LiveLocalWeatherBar({ onHourChange }: LiveLocalWeatherBarProps) {
  const popoverId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastReportedHourRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [now, setNow] = useState<Date | null>(null);
  const [browserTz, setBrowserTz] = useState<string>("Asia/Jakarta");
  const [clockPrefs, setClockPrefs] = useState<ClockPreferences>(DEFAULT_CLOCK_PREFS);
  const [supportsPopover, setSupportsPopover] = useState<boolean>(false);
  const [fallbackMenuOpen, setFallbackMenuOpen] = useState<boolean>(false);

  const [weatherData, setWeatherData] = useState<WeatherApiResponse | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(true);
  const [locatingGps, setLocatingGps] = useState<boolean>(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);

  const activeTz = browserTz || weatherData?.timezone || "Asia/Jakarta";

  // 1. Hydrate clock preferences, detect native Popover support & start 1s realtime clock
  useEffect(() => {
    setClockPrefs(readClockPreferences());
    setSupportsPopover(
      typeof HTMLElement !== "undefined" &&
        Object.hasOwn(HTMLElement.prototype, "popover")
    );
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

  // Fallback outside-click & Escape dismiss only when native Popover API is unavailable
  useEffect(() => {
    if (supportsPopover || !fallbackMenuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setFallbackMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFallbackMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [supportsPopover, fallbackMenuOpen]);

  // Sync greeting hour dynamically if user stays open across time-of-day transitions
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

  const updateClockPrefs = useCallback(
    (updater: (prev: ClockPreferences) => ClockPreferences) => {
      setClockPrefs((prev) => {
        const next = updater(prev);
        persistClockPreferences(next);
        return next;
      });
    },
    []
  );

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
        // Keep existing weather gracefully
      } finally {
        cleanup();
        if (!controller.signal.aborted) {
          setLoadingWeather(false);
        }
      }
    },
    [browserTz]
  );

  // Initial weather fetch + 10-minute refresh when tab is visible
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
          setLocationHint("Izin GPS ditolak — memakai lokasi jaringan");
        } else {
          setLocationHint("Gagal memuat GPS — memperbarui lokasi jaringan");
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

  const clockParts = useMemo(() => {
    if (!now) {
      return {
        hh12: "--",
        hh24: "--",
        mm: "--",
        ss: "--",
        period: "AM" as "AM" | "PM",
      };
    }
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: activeTz,
      }).formatToParts(now);
      const rawHour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
      const mm = (parts.find((p) => p.type === "minute")?.value ?? "00").padStart(2, "0");
      const ss = (parts.find((p) => p.type === "second")?.value ?? "00").padStart(2, "0");
      const period: "AM" | "PM" = rawHour >= 12 ? "PM" : "AM";
      const h12 = rawHour % 12 === 0 ? 12 : rawHour % 12;
      return {
        hh12: String(h12).padStart(2, "0"),
        hh24: String(rawHour).padStart(2, "0"),
        mm,
        ss,
        period,
      };
    } catch {
      return {
        hh12: "--",
        hh24: "--",
        mm: "--",
        ss: "--",
        period: "AM" as "AM" | "PM",
      };
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
  const rawCityOrLabel = (
    weatherData?.location?.city ||
    weatherData?.location?.label ||
    ""
  ).trim();
  const tzCityFallback =
    activeTz.split("/").pop()?.replace(/_/g, " ") || "Jakarta";
  const locationDisplayName =
    rawCityOrLabel &&
    rawCityOrLabel.toLowerCase() !== "lokasi terdeteksi"
      ? rawCityOrLabel
      : tzCityFallback;

  const weatherTooltip = weather
    ? `Terasa seperti ${weather.feelsLikeC}°C • Kelembapan ${weather.humidityPct}% • Angin ${weather.windKmh} km/jam`
    : "Cuaca realtime lokal";

  const settingsPanelBody = (
    <div className="w-60 p-3 space-y-2.5 text-left">
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#F1F5F9]">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#121215]">
          <SlidersHorizontal size={12} className="text-[#4F39F6]" aria-hidden="true" />
          <span>Pengaturan Jam</span>
        </span>
        <span className="text-[10px] font-bold text-[#64748B]">{tzShortLabel}</span>
      </div>

      {/* Format 12 / 24 Jam */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
          Format Waktu
        </p>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F8FAFC] p-1 border border-[#EAECEF]">
          <button
            type="button"
            aria-pressed={clockPrefs.hourFormat === "12h"}
            onClick={() =>
              updateClockPrefs((p) => ({ ...p, hourFormat: "12h" }))
            }
            className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
              clockPrefs.hourFormat === "12h"
                ? "bg-white text-[#4F39F6] shadow-2xs border border-[#4F39F6]/20"
                : "text-[#64748B] hover:text-[#121215]"
            }`}
          >
            12 Jam (AM/PM)
          </button>
          <button
            type="button"
            aria-pressed={clockPrefs.hourFormat === "24h"}
            onClick={() =>
              updateClockPrefs((p) => ({ ...p, hourFormat: "24h" }))
            }
            className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
              clockPrefs.hourFormat === "24h"
                ? "bg-white text-[#4F39F6] shadow-2xs border border-[#4F39F6]/20"
                : "text-[#64748B] hover:text-[#121215]"
            }`}
          >
            24 Jam
          </button>
        </div>
      </div>

      {/* Toggle Detik */}
      <button
        type="button"
        aria-pressed={clockPrefs.showSeconds}
        onClick={() =>
          updateClockPrefs((p) => ({ ...p, showSeconds: !p.showSeconds }))
        }
        className="w-full flex items-center justify-between gap-2 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#EAECEF] px-2.5 py-2 text-[11px] font-bold text-[#121215] transition-colors cursor-pointer"
      >
        <span className="inline-flex items-center gap-1.5">
          <Clock size={12} className="text-[#4F39F6]" aria-hidden="true" />
          <span>Tampilkan Detik</span>
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
            clockPrefs.showSeconds
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {clockPrefs.showSeconds && <Check size={10} aria-hidden="true" />}
          {clockPrefs.showSeconds ? "ON" : "OFF"}
        </span>
      </button>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-start lg:items-end lg:text-right select-none"
      aria-label="Jam, cuaca, dan lokasi realtime Anda"
    >
      {/* 1. Jam Besar Tanpa Kotak (Klik untuk ubah 12/24 jam & detik) */}
      <button
        type="button"
        {...(supportsPopover
          ? { popoverTarget: popoverId }
          : { onClick: () => setFallbackMenuOpen((o) => !o) })}
        title="Klik untuk atur format 12/24 jam & tampilan detik"
        aria-label={`Jam lokal ${
          clockPrefs.hourFormat === "12h"
            ? `${clockParts.hh12}:${clockParts.mm} ${clockParts.period}`
            : `${clockParts.hh24}:${clockParts.mm}`
        } ${tzShortLabel}. Klik untuk ubah format 12/24 jam atau detik`}
        className="group inline-flex items-end bg-transparent border-0 p-0 text-left lg:text-right cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4F39F6] rounded-lg transition-opacity hover:opacity-80"
      >
        {clockPrefs.hourFormat === "12h" ? (
          <div className="inline-flex items-stretch">
            <span className="text-4xl sm:text-[46px] font-black tracking-tight leading-none text-[#121215] tabular-nums">
              {clockParts.hh12}:{clockParts.mm}
            </span>
            <span
              className={`ml-1.5 flex flex-col ${
                clockPrefs.showSeconds ? "justify-between" : "justify-end"
              } py-[2px] text-left`}
            >
              {clockPrefs.showSeconds && (
                <span className="text-[12px] sm:text-[13px] font-bold text-[#64748B] tabular-nums leading-none">
                  {clockParts.ss}
                </span>
              )}
              <span className="text-[12px] sm:text-[13px] font-extrabold text-[#4F39F6] tracking-wider leading-none">
                {clockParts.period}
              </span>
            </span>
          </div>
        ) : (
          <div className="inline-flex items-baseline">
            <span className="text-4xl sm:text-[46px] font-black tracking-tight leading-none text-[#121215] tabular-nums">
              {clockParts.hh24}:{clockParts.mm}
            </span>
            {clockPrefs.showSeconds && (
              <span className="ml-0.5 text-base sm:text-lg font-bold text-[#64748B] tabular-nums leading-none">
                :{clockParts.ss}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Panel Pengaturan Jam (Top-layer Popover API + Fallback untuk browser lama) */}
      {supportsPopover ? (
        <div
          id={popoverId}
          popover="auto"
          className="rs-clock-popover"
        >
          {settingsPanelBody}
        </div>
      ) : (
        fallbackMenuOpen && (
          <div className="rs-clock-popover absolute left-0 lg:left-auto lg:right-0 top-full mt-2 z-50">
            {settingsPanelBody}
          </div>
        )
      )}

      {/* 2. Cuaca & Lokasi Menyatu Tanpa Kotak (gaya iOS) */}
      <div className="mt-1.5 flex flex-wrap items-center justify-start lg:justify-end gap-x-2 gap-y-0.5 text-xs sm:text-[13px] font-semibold text-[#334155]">
        {loadingWeather && !weather ? (
          <span className="inline-flex items-center gap-1.5 text-[#64748B]">
            <RefreshCw size={12} className="animate-spin text-[#0EA5E9]" aria-hidden="true" />
            <span>Memuat cuaca...</span>
          </span>
        ) : weather ? (
          <span
            className="inline-flex items-center gap-1.5"
            title={weatherTooltip}
          >
            {renderWeatherIcon(weather.icon)}
            <span className="font-extrabold text-[#121215] tabular-nums">
              {weather.temperatureC}°C
            </span>
            <span className="text-[#475569]">{weather.condition}</span>
          </span>
        ) : null}

        {(weather || loadingWeather) && (
          <span className="text-[#CBD5E1]" aria-hidden="true">
            •
          </span>
        )}

        <button
          type="button"
          onClick={handleRequestGpsLocation}
          disabled={locatingGps}
          title="Klik untuk perbarui lokasi GPS akurat & cuaca realtime"
          aria-label={`Lokasi: ${locationDisplayName}. Klik untuk perbarui lokasi GPS dan cuaca`}
          className="inline-flex items-center gap-1 bg-transparent border-0 p-0 text-xs sm:text-[13px] font-semibold text-[#475569] hover:text-[#4F39F6] transition-colors cursor-pointer disabled:opacity-60"
        >
          <MapPin size={12} className="text-[#10B981] shrink-0" aria-hidden="true" />
          <span className="max-w-[190px] truncate">{locationDisplayName}</span>
          {locatingGps && (
            <RefreshCw size={11} className="animate-spin text-[#94A3B8]" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* 3. Baris Tanggal & Timezone Halus */}
      <div className="mt-0.5 text-[11px] font-medium text-[#64748B]">
        {formattedDate ? `${formattedDate} • ${tzShortLabel}` : tzShortLabel}
      </div>

      {locationHint && (
        <p className="mt-0.5 text-[10px] font-medium text-[#64748B]" role="status">
          {locationHint}
        </p>
      )}
    </div>
  );
}
