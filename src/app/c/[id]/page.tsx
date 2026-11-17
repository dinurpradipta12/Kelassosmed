"use client";

import React from "react";
import { useParams } from "next/navigation";
import { PublicCoursePlayer } from "@/components/landing/PublicCoursePlayer";

export default function PublicShortCoursePage() {
  const params = useParams<{ id: string }>();
  return <PublicCoursePlayer courseIdOrCode={params?.id || ""} />;
}
