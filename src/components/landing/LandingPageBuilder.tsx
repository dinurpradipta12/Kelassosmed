"use client";

import React from "react";
import type { LandingPageConfig, LandingPageData } from "@/types/landing";
import { LandingPageEditor } from "./editor/LandingPageEditor";

export { LandingPageEditor } from "./editor/LandingPageEditor";
export * from "./editor/EditorHeader";
export * from "./editor/BlockPalette";
export * from "./editor/EditorCanvas";
export * from "./editor/InspectorPanel";
export * from "./editor/renderers";

export interface LandingPageBuilderProps {
  initialConfig: LandingPageConfig;
  onSave: (config: LandingPageConfig) => void;
  onExit: () => void;
  onShowToast: (msg: string) => void;
  onPreviewPublic: () => void;
}

export function LandingPageBuilder({
  initialConfig,
  onSave,
  onExit,
  onShowToast,
  onPreviewPublic,
}: LandingPageBuilderProps) {
  return (
    <LandingPageEditor
      initialConfig={initialConfig}
      onSave={(data: LandingPageData) => onSave(data as LandingPageConfig)}
      onExit={onExit}
      onShowToast={onShowToast}
      onPreviewPublic={onPreviewPublic}
    />
  );
}
