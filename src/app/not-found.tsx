"use client";

import React, { useEffect, useState } from "react";
import { UnderConstructionView } from "@/components/maintenance/UnderConstructionView";
import {
  DEFAULT_MAINTENANCE_CONFIG,
  type MaintenanceConfig,
} from "@/context/RuangSosmedStore";
import {
  supabase,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export default function NotFoundPage() {
  const [config, setConfig] = useState<MaintenanceConfig>(
    DEFAULT_MAINTENANCE_CONFIG
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(
        "ruang_sosmed_maintenance_config_v1"
      );
      if (raw) {
        setConfig({ ...DEFAULT_MAINTENANCE_CONFIG, ...JSON.parse(raw) });
      }
    } catch {}

    if (!isSupabaseConfigured) return;

    supabase
      .from("contents")
      .select("settings_json")
      .eq("title", "__SYSTEM_MAINTENANCE_CONFIG__")
      .maybeSingle()
      .then(({ data }: { data: { settings_json?: any } | null }) => {
        const remote = data?.settings_json?.maintenanceConfig;
        if (remote && typeof remote === "object") {
          const merged = { ...DEFAULT_MAINTENANCE_CONFIG, ...remote };
          setConfig(merged);
          try {
            window.localStorage.setItem(
              "ruang_sosmed_maintenance_config_v1",
              JSON.stringify(merged)
            );
          } catch {}
        }
      });
  }, []);

  return <UnderConstructionView config={config} isNotFoundRoute />;
}
