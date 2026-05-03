/**
 * Typed client for the VSMC backend.
 *
 * The shapes here MUST match `backend/app/models/schemas.py`. If you change
 * one, change the other.
 */

export type Category =
  | "iss"
  | "gps"
  | "starlink"
  | "weather"
  | "science"
  | "comms"
  | "other";

export interface Satellite {
  norad_id: number;
  name: string;
  category: Category | string;
}

export interface Position {
  norad_id: number;
  name: string;
  timestamp: string; // ISO 8601 UTC
  latitude_deg: number;
  longitude_deg: number;
  altitude_km: number;
  velocity_kms: number | null;
}

export interface PositionList {
  timestamp: string;
  count: number;
  positions: Position[];
}

// In dev, the Next rewrite proxies /api/* to the backend (same-origin, no CORS).
// In prod, we hit the backend directly using the env var, and CORS on the
// backend is configured to allow our Vercel origin.
const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} from ${path}`);
  }
  return (await res.json()) as T;
}

export const api = {
  listSatellites: () => getJson<Satellite[]>("/api/satellites"),
  getSatellite: (id: number) => getJson<Satellite>(`/api/satellites/${id}`),
  getPosition: (id: number) => getJson<Position>(`/api/satellites/${id}/position`),
  getAllPositions: () => getJson<PositionList>("/api/satellites/positions"),
};
