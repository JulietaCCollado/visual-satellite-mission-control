"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

interface Props {
  satelliteCount: number;
  lastUpdate: Date | null;
  isLive: boolean;
  error: string | null;
}

export default function TopBar({ satelliteCount, lastUpdate, isLive, error }: Props) {
  // Live UTC clock — updates every second.
  const [utc, setUtc] = useState<string>("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setUtc(
        `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
        `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const ageSec = lastUpdate
    ? Math.max(0, Math.floor((Date.now() - lastUpdate.getTime()) / 1000))
    : null;

  return (
    <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex items-start justify-between pointer-events-none">
      {/* Left: brand + status */}
      <div className="pointer-events-auto">
        <div
          className="text-2xl font-display tracking-[0.2em] glow-phosphor"
          style={{ fontFamily: "var(--font-display)" }}
        >
          vsmc
        </div>
        <div className="label mt-1">visual satellite mission control</div>
      </div>

      {/* Center: status indicators */}
      <div className="pointer-events-auto flex items-center gap-6 panel panel-brackets px-5 py-2.5">
        <StatusItem
          label="Link"
          value={error ? "LOST" : isLive ? "NOMINAL" : "STANDBY"}
          tone={error ? "signal" : isLive ? "phosphor" : "amber"}
          blink={isLive}
        />
        <Divider />
        <StatusItem
          label="Tracked"
          value={`${satelliteCount.toString().padStart(3, "0")} OBJ`}
          tone="phosphor"
        />
        <Divider />
        <StatusItem
          label="Last fix"
          value={ageSec === null ? "—" : `T+${ageSec}s`}
          tone={ageSec !== null && ageSec > 10 ? "amber" : "phosphor"}
        />
      </div>

      {/* Right: clock */}
      <div className="pointer-events-auto text-right">
        <div className="label">mission time</div>
        <div className="text-phosphor text-sm tracking-wider tabular-nums mt-1">
          {utc || "—"}
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-phosphor/20" />;
}

function StatusItem({
  label,
  value,
  tone,
  blink = false,
}: {
  label: string;
  value: string;
  tone: "phosphor" | "amber" | "signal";
  blink?: boolean;
}) {
  const toneClass = {
    phosphor: "text-phosphor",
    amber: "text-amber",
    signal: "text-signal",
  }[tone];
  return (
    <div className="flex flex-col items-start">
      <div className="label">{label}</div>
      <div className={clsx("text-sm tracking-wider mt-0.5", toneClass)}>
        {blink && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse-soft" />}
        {value}
      </div>
    </div>
  );
}
