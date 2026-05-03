"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { api, type Position, type Satellite } from "@/lib/api";
import TopBar from "@/components/TopBar";
import SatelliteList from "@/components/SatelliteList";
import SatelliteDetail from "@/components/SatelliteDetail";

// Globe is WebGL → load only on the client.
const GlobeView = dynamic(() => import("@/components/GlobeView"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-phosphor/40 text-xs tracking-widest">
      <span className="animate-pulse-soft">initializing globe…</span>
    </div>
  ),
});

const REFRESH_MS = 3000;

export default function Page() {
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [positions, setPositions] = useState<Map<number, Position>>(new Map());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cache the category-by-NORAD lookup the globe needs.
  const categoryByNorad = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of satellites) m.set(s.norad_id, s.category);
    return m;
  }, [satellites]);

  // Initial load: catalog of satellites. We retry with backoff because on
  // a free Render instance the first request may take ~30s to wake the
  // backend. Without retries, a cold start looks like a hard failure.
  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const load = async () => {
      while (!cancelled) {
        try {
          const sats = await api.listSatellites();
          if (!cancelled) {
            setSatellites(sats);
            setError(null);
          }
          return;
        } catch (err: any) {
          attempt++;
          if (!cancelled) {
            setError(
              attempt < 4
                ? "Establishing uplink… (backend cold-starting, may take 30s)"
                : `Catalog load failed: ${err.message}`,
            );
          }
          if (attempt > 8) return; // give up after ~2 minutes
          await new Promise((r) => setTimeout(r, Math.min(2000 * attempt, 8000)));
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Position polling loop. We use a ref-based interval so we can survive
  // re-renders without resetting the timer.
  const fetchPositions = useCallback(async () => {
    try {
      const data = await api.getAllPositions();
      const map = new Map<number, Position>();
      for (const p of data.positions) map.set(p.norad_id, p);
      setPositions(map);
      setLastUpdate(new Date(data.timestamp));
      setError(null);
    } catch (err: any) {
      setError(`Telemetry fetch failed: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
    const id = setInterval(fetchPositions, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchPositions]);

  // Derived: the selected satellite's static info + latest position.
  const selectedSat = useMemo(
    () => satellites.find((s) => s.norad_id === selectedId) ?? null,
    [satellites, selectedId],
  );
  const selectedPos = selectedId !== null ? positions.get(selectedId) ?? null : null;

  const positionsArray = useMemo(() => Array.from(positions.values()), [positions]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-void-900">
      {/* Background grid texture — pure CSS for performance. */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(122,240,194,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(122,240,194,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Globe fills the viewport. */}
      <div className="absolute inset-0">
        <GlobeView
          positions={positionsArray}
          categoryByNorad={categoryByNorad}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Floating UI overlays. */}
      <TopBar
        satelliteCount={satellites.length}
        lastUpdate={lastUpdate}
        isLive={lastUpdate !== null && error === null}
        error={error}
      />

      <SatelliteList
        satellites={satellites}
        positions={positions}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <SatelliteDetail
        satellite={selectedSat}
        position={selectedPos}
        onClose={() => setSelectedId(null)}
      />

      {/* Bottom-left attribution / classification stripe — pure aesthetic. */}
      <div className="absolute bottom-3 left-6 right-6 flex justify-between items-end pointer-events-none z-10">
        <div className="label opacity-50">
          telemetry source: celestrak.org · sgp4 propagator · skyfield
        </div>
        <div className="label opacity-50 tracking-[0.3em]">
          unclassified · for engineering use
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 panel border-signal/40 px-4 py-2 z-30 pointer-events-auto">
          <div className="text-xs text-signal tracking-wider">
            <span className="animate-blink">▮</span> {error}
          </div>
        </div>
      )}
    </main>
  );
}
