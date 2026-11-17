"use client";

import React from "react";

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-transition-enter min-h-screen">{children}</div>;
}
