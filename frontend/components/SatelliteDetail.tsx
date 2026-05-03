"use client";

import clsx from "clsx";
import type { Satellite, Position } from "@/lib/api";
import { metaFor } from "@/lib/categories";

interface Props {
  satellite: Satellite | null;
  position: Position | null;
  onClose: () => void;
}

export default function SatelliteDetail({ satellite, position, onClose }: Props) {
  if (!satellite) return null;
  const meta = metaFor(satellite.category);

  return (
    <div className="absolute right-6 top-24 w-80 z-10 panel panel-brackets pointer-events-auto">
      <div className="px-4 pt-4 pb-3 flex items-start justify-between border-b border-phosphor/15">
        <div className="min-w-0">
          <div className="label">target acquired</div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse-soft"
              style={{
                backgroundColor: meta.globeColor,
                boxShadow: `0 0 8px ${meta.globeColor}`,
              }}
            />
            <span className="text-phosphor-glow text-sm tracking-wider truncate">
              {satellite.name}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-phosphor/50 hover:text-phosphor transition text-xs tracking-widest pl-2"
          aria-label="Close"
        >
          [×]
        </button>
      </div>

      <div className="grid grid-cols-2 gap-px bg-phosphor/10">
        <Stat label="NORAD" value={`N${satellite.norad_id}`} />
        <Stat
          label="Class"
          value={meta.label.toUpperCase()}
          colorOverride={meta.globeColor}
        />
        {position ? (
          <>
            <Stat
              label="Latitude"
              value={`${position.latitude_deg.toFixed(3)}°`}
              tabular
            />
            <Stat
              label="Longitude"
              value={`${position.longitude_deg.toFixed(3)}°`}
              tabular
            />
            <Stat
              label="Altitude"
              value={`${position.altitude_km.toFixed(1)} km`}
              tabular
            />
            <Stat
              label="Velocity"
              value={
                position.velocity_kms !== null
                  ? `${position.velocity_kms.toFixed(2)} km/s`
                  : "—"
              }
              tabular
            />
          </>
        ) : (
          <div className="col-span-2 px-4 py-6 text-xs text-phosphor/40 text-center bg-void-900/40">
            acquiring telemetry…
          </div>
        )}
      </div>

      {position && (
        <div className="px-4 py-3 border-t border-phosphor/15">
          <div className="label mb-2">subpoint</div>
          <SubpointReadout
            lat={position.latitude_deg}
            lng={position.longitude_deg}
          />
        </div>
      )}

      {position && position.velocity_kms !== null && (
        <div className="px-4 py-3 border-t border-phosphor/15">
          <div className="label mb-1">orbital velocity</div>
          <VelocityBar velocity={position.velocity_kms} />
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tabular = false,
  colorOverride,
}: {
  label: string;
  value: string;
  tabular?: boolean;
  colorOverride?: string;
}) {
  return (
    <div className="bg-void-900/40 px-4 py-2.5">
      <div className="label">{label}</div>
      <div
        className={clsx(
          "text-sm mt-0.5 tracking-wider",
          tabular && "tabular-nums",
        )}
        style={{ color: colorOverride ?? "#a4f5d3" }}
      >
        {value}
      </div>
    </div>
  );
}

function SubpointReadout({ lat, lng }: { lat: number; lng: number }) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return (
    <div className="text-xs tracking-wider text-phosphor/80 tabular-nums">
      {Math.abs(lat).toFixed(4)}° {ns}, {Math.abs(lng).toFixed(4)}° {ew}
    </div>
  );
}

function VelocityBar({ velocity }: { velocity: number }) {
  // Most LEO satellites: 7.5–7.8 km/s. GEO: ~3 km/s. Map 0–8 to a bar.
  const pct = Math.min(100, (velocity / 8) * 100);
  return (
    <div>
      <div className="h-1.5 bg-void-900 border border-phosphor/15 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-phosphor/70"
          style={{
            width: `${pct}%`,
            boxShadow: "0 0 8px rgba(122,240,194,0.6)",
          }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-phosphor/40 tracking-wider tabular-nums">
        <span>0</span>
        <span>{velocity.toFixed(2)} KM/S</span>
        <span>8</span>
      </div>
    </div>
  );
}
