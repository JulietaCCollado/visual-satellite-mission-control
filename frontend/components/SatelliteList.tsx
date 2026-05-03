"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { Satellite, Position } from "@/lib/api";
import { CATEGORY_META, metaFor } from "@/lib/categories";

interface Props {
  satellites: Satellite[];
  positions: Map<number, Position>;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export default function SatelliteList({
  satellites,
  positions,
  selectedId,
  onSelect,
}: Props) {
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Counts per category for the filter chips.
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const s of satellites) {
      c.set(s.category, (c.get(s.category) ?? 0) + 1);
    }
    return c;
  }, [satellites]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return satellites.filter((s) => {
      if (filter && s.category !== filter) return false;
      if (q && !s.name.toLowerCase().includes(q) && !String(s.norad_id).includes(q))
        return false;
      return true;
    });
  }, [satellites, filter, query]);

  return (
    <div className="absolute left-6 top-24 bottom-6 w-80 z-10 panel panel-brackets flex flex-col pointer-events-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-phosphor/15">
        <div className="label mb-2">catalog</div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search by name or NORAD ID…"
          className="w-full bg-void-900/60 border border-phosphor/15 px-3 py-1.5 text-sm text-phosphor placeholder:text-phosphor/30 focus:outline-none focus:border-phosphor/40 transition tracking-wide"
        />
      </div>

      {/* Category filter chips */}
      <div className="px-4 py-3 border-b border-phosphor/15 flex flex-wrap gap-1.5">
        <Chip
          label="ALL"
          count={satellites.length}
          active={filter === null}
          onClick={() => setFilter(null)}
        />
        {Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([cat, n]) => {
            const meta = metaFor(cat);
            return (
              <Chip
                key={cat}
                label={(CATEGORY_META[cat]?.label ?? cat).toUpperCase()}
                count={n}
                active={filter === cat}
                onClick={() => setFilter(filter === cat ? null : cat)}
                color={meta.globeColor}
              />
            );
          })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto thin-scroll">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-phosphor/40">
            no objects match
          </div>
        )}
        {filtered.map((s) => {
          const meta = metaFor(s.category);
          const pos = positions.get(s.norad_id);
          const selected = s.norad_id === selectedId;
          return (
            <button
              key={s.norad_id}
              onClick={() => onSelect(selected ? null : s.norad_id)}
              className={clsx(
                "w-full text-left px-4 py-2 border-b border-phosphor/5 transition group",
                selected
                  ? "bg-phosphor/15 border-phosphor/30"
                  : "hover:bg-void-700/60",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: meta.globeColor,
                    boxShadow: `0 0 6px ${meta.globeColor}`,
                  }}
                />
                <span
                  className={clsx(
                    "text-xs tracking-wider truncate",
                    selected ? "text-phosphor-glow" : "text-zinc-300",
                  )}
                >
                  {s.name}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1 pl-4 text-[10px] tracking-wider">
                <span className="text-phosphor/40">N{s.norad_id}</span>
                {pos && (
                  <span className="text-phosphor/60 tabular-nums">
                    {pos.altitude_km.toFixed(0)} KM
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer count */}
      <div className="px-4 py-2 border-t border-phosphor/15 label">
        showing {filtered.length} of {satellites.length}
      </div>
    </div>
  );
}

function Chip({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "text-[10px] tracking-[0.15em] px-2 py-0.5 border transition",
        active
          ? "bg-phosphor/15 border-phosphor/50 text-phosphor-glow"
          : "border-phosphor/15 text-phosphor/50 hover:border-phosphor/30 hover:text-phosphor/80",
      )}
      style={
        active && color
          ? { borderColor: color, color: color, backgroundColor: `${color}15` }
          : undefined
      }
    >
      {label} <span className="opacity-60">{count}</span>
    </button>
  );
}
