"use client";

import React, { useEffect } from "react";
import {
  applyThemeToDocument,
  loadSavedThemeConfig,
} from "@/components/theme/ThemeCustomizerModal";

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    applyThemeToDocument(loadSavedThemeConfig());
  }, []);

  return <div className="page-transition-enter min-h-screen">{children}</div>;
}
