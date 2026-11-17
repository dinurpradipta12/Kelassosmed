"use client";

import React from "react";
import { useParams } from "next/navigation";
import { LmsBuilderDashboard } from "@/components/landing/LmsBuilderDashboard";

export default function AdminClassResultsPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id || "";
  return (
    <LmsBuilderDashboard
      initialSpaceType="recorded_class"
      initialCourseId={courseId}
      initialViewMode="results"
    />
  );
}
