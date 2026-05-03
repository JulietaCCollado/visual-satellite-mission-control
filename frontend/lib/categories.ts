/**
 * Visual metadata for each satellite category.
 *
 * Colors map to our Tailwind palette. Globe colors use bright hex because
 * they need to glow on the dark Earth.
 */

import type { Category } from "./api";

export interface CategoryMeta {
  label: string;
  globeColor: string; // hex, used by react-globe.gl
  textClass: string;  // Tailwind text color
  bgClass: string;    // Tailwind bg color (faint)
  borderClass: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  iss: {
    label: "Crewed",
    globeColor: "#7af0c2",
    textClass: "text-phosphor",
    bgClass: "bg-phosphor/10",
    borderClass: "border-phosphor/40",
  },
  gps: {
    label: "Navigation",
    globeColor: "#5ec5ff",
    textClass: "text-ion",
    bgClass: "bg-ion/10",
    borderClass: "border-ion/40",
  },
  weather: {
    label: "Weather",
    globeColor: "#ffb94d",
    textClass: "text-amber",
    bgClass: "bg-amber/10",
    borderClass: "border-amber/40",
  },
  science: {
    label: "Science",
    globeColor: "#c599ff",
    textClass: "text-[#c599ff]",
    bgClass: "bg-[#c599ff]/10",
    borderClass: "border-[#c599ff]/40",
  },
  starlink: {
    label: "Starlink",
    globeColor: "#e8e8e8",
    textClass: "text-zinc-200",
    bgClass: "bg-zinc-200/10",
    borderClass: "border-zinc-200/40",
  },
  comms: {
    label: "Comms",
    globeColor: "#ff8fb1",
    textClass: "text-[#ff8fb1]",
    bgClass: "bg-[#ff8fb1]/10",
    borderClass: "border-[#ff8fb1]/40",
  },
  other: {
    label: "Other",
    globeColor: "#8a92a3",
    textClass: "text-zinc-400",
    bgClass: "bg-zinc-400/10",
    borderClass: "border-zinc-400/40",
  },
};

export function metaFor(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? CATEGORY_META.other;
}
