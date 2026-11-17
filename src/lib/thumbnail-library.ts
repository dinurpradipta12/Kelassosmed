// =============================================================================
// RUANG SOSMED 2.0 — DEFAULT THUMBNAIL LIBRARY
// File: src/lib/thumbnail-library.ts
// Central catalog of default thumbnails provided in `src/thumbnail`
// =============================================================================

export interface DefaultThumbnailItem {
  id: string;
  filename: string;
  src: string;
  title: string;
  category: "Social Media" | "Analytics" | "Strategy" | "Content" | "Branding" | "General";
}

export const RUANG_SOSMED_DEFAULT_THUMBNAILS: DefaultThumbnailItem[] = [
  { id: "thumb-1", filename: "thumbnail1.png", src: "/thumbnail/thumbnail1.png", title: "Thumbnail 1", category: "Social Media" },
  { id: "thumb-2", filename: "thumbnail2.png", src: "/thumbnail/thumbnail2.png", title: "Thumbnail 2", category: "Analytics" },
  { id: "thumb-3", filename: "thumbnail3.png", src: "/thumbnail/thumbnail3.png", title: "Thumbnail 3", category: "Strategy" },
  { id: "thumb-4", filename: "thumbnail4.png", src: "/thumbnail/thumbnail4.png", title: "Thumbnail 4", category: "Content" },
  { id: "thumb-5", filename: "thumbnail5.png", src: "/thumbnail/thumbnail5.png", title: "Thumbnail 5", category: "Branding" },
  { id: "thumb-6", filename: "thumbnail6.png", src: "/thumbnail/thumbnail6.png", title: "Thumbnail 6", category: "Social Media" },
  { id: "thumb-7", filename: "thumbnail7.png", src: "/thumbnail/thumbnail7.png", title: "Thumbnail 7", category: "Strategy" },
  { id: "thumb-8", filename: "thumbnail8.png", src: "/thumbnail/thumbnail8.png", title: "Thumbnail 8", category: "Analytics" },
  { id: "thumb-9", filename: "thumbnail9.png", src: "/thumbnail/thumbnail9.png", title: "Thumbnail 9", category: "Content" },
  { id: "thumb-10", filename: "thumbnail10.png", src: "/thumbnail/thumbnail10.png", title: "Thumbnail 10", category: "Branding" },
  { id: "thumb-11", filename: "thumbnail11.png", src: "/thumbnail/thumbnail11.png", title: "Thumbnail 11", category: "Social Media" },
  { id: "thumb-12", filename: "thumbnail12.png", src: "/thumbnail/thumbnail12.png", title: "Thumbnail 12", category: "Strategy" },
  { id: "thumb-13", filename: "thumbnail13.png", src: "/thumbnail/thumbnail13.png", title: "Thumbnail 13", category: "Analytics" },
  { id: "thumb-14", filename: "thumbnail14.png", src: "/thumbnail/thumbnail14.png", title: "Thumbnail 14", category: "Content" },
  { id: "thumb-15", filename: "thumbnail15.png", src: "/thumbnail/thumbnail15.png", title: "Thumbnail 15", category: "Branding" },
  { id: "thumb-16", filename: "thumbnail16.png", src: "/thumbnail/thumbnail16.png", title: "Thumbnail 16", category: "General" },
];

export interface ColorGradientPreset {
  id: string;
  idx: number;
  bg: string;
  name?: string;
}

export const COLOR_AND_GRADIENT_PRESETS: ColorGradientPreset[] = [
  { id: "cg-1", idx: 4, bg: "#34D399", name: "Emerald Mint" },
  { id: "cg-2", idx: 5, bg: "#38BDF8", name: "Sky Blue" },
  { id: "cg-3", idx: 6, bg: "#6366F1", name: "Indigo Purple" },
  { id: "cg-4", idx: 7, bg: "#F43F5E", name: "Rose Pink" },
  { id: "cg-5", idx: 0, bg: "linear-gradient(120deg, #5EEAD4 0%, #FDE047 100%)", name: "Teal Sun" },
  { id: "cg-6", idx: 1, bg: "linear-gradient(120deg, #C4B5FD 0%, #93C5FD 100%)", name: "Soft Lavender" },
  { id: "cg-7", idx: 2, bg: "linear-gradient(120deg, #FBCFE8 0%, #DDD6FE 100%)", name: "Blush Violet" },
  { id: "cg-8", idx: 3, bg: "linear-gradient(120deg, #FDE047 0%, #F472B6 100%)", name: "Sunset Peach" },
];

export interface SimpleIllustrationPreset {
  id: string;
  idx: number;
  label: string;
  bg: string;
}

export const SIMPLE_ILLUSTRATION_PRESETS: SimpleIllustrationPreset[] = [
  { id: "ill-1", idx: 0, label: "Analytics UI", bg: "linear-gradient(120deg, #5EEAD4 0%, #FDE047 100%)" },
  { id: "ill-2", idx: 1, label: "Design Palette", bg: "linear-gradient(120deg, #C4B5FD 0%, #93C5FD 100%)" },
  { id: "ill-3", idx: 2, label: "Creative Studio", bg: "linear-gradient(120deg, #FBCFE8 0%, #A7F3D0 100%)" },
  { id: "ill-4", idx: 3, label: "Style System", bg: "linear-gradient(120deg, #FDE047 0%, #FDBA74 100%)" },
];
