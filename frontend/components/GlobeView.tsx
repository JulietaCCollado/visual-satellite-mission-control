"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { Position } from "@/lib/api";
import { metaFor } from "@/lib/categories";
import * as THREE from "three";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

interface SatPoint {
  norad_id: number;
  name: string;
  category: string;
  lat: number;
  lng: number;
  alt: number;
  altKm: number;
  velocity: number | null;
  color: string;
  size: number;
}

interface Props {
  positions: Position[];
  categoryByNorad: Map<number, string>;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

const EARTH_RADIUS_KM = 6371;

function buildPoints(
  positions: Position[],
  categoryByNorad: Map<number, string>,
  selectedId: number | null,
): SatPoint[] {
  return positions.map((p) => {
    const category = categoryByNorad.get(p.norad_id) ?? "other";
    const meta = metaFor(category);
    const isSelected = p.norad_id === selectedId;
    // Compress altitude so LEO and GEO are both visible.
    const compressedAlt = Math.log(1 + p.altitude_km / EARTH_RADIUS_KM) * 0.15;
    return {
      norad_id: p.norad_id,
      name: p.name,
      category,
      lat: p.latitude_deg,
      lng: p.longitude_deg,
      alt: compressedAlt,
      altKm: p.altitude_km,
      velocity: p.velocity_kms,
      color: meta.globeColor,
      size: isSelected ? 1.6 : category === "iss" ? 1.2 : 0.9,
    };
  });
}

export default function GlobeView({
  positions,
  categoryByNorad,
  selectedId,
  onSelect,
}: Props) {
  const globeRef = useRef<any>(null);
  

  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.6 }, 0);
    const controls = globeRef.current.controls?.();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableDamping = true;
      const stop = () => {
        controls.autoRotate = false;
      };
      controls.addEventListener?.("start", stop);
    }
  }, []);

  const points = buildPoints(positions, categoryByNorad, selectedId);

  return (
    <Globe
      ref={globeRef}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      backgroundColor="rgba(0,0,0,0)"
      showAtmosphere
      atmosphereColor="#7af0c2"
      atmosphereAltitude={0.18}
      // customLayer renders arbitrary 3D objects at lat/lng/altitude.
      // Each satellite becomes a small glowing sphere — not a cylinder.
      customLayerData={points}
      customThreeObject={(d: any) => {
        const geom = new THREE.SphereGeometry(d.size, 12, 12);
        const mat = new THREE.MeshBasicMaterial({
          color: d.color,
          transparent: true,
          opacity: 0.95,
        });
        return new THREE.Mesh(geom, mat);
      }}
      customThreeObjectUpdate={(obj: any, d: any) => {
        if (!obj || !globeRef.current) return;
        const coords = globeRef.current.getCoords(d.lat, d.lng, d.alt);
        obj.position.set(coords.x, coords.y, coords.z);
      }}
      onCustomLayerClick={(d: any) => onSelect(d.norad_id)}
      onCustomLayerHover={(d: any) => {
        if (typeof document !== "undefined") {
          document.body.style.cursor = d ? "pointer" : "default";
        }
      }}
      width={undefined}
      height={undefined}
    />
  );
}