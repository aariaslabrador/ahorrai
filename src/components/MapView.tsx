"use client";

import dynamic from "next/dynamic";
import type { MapMarker } from "./Map";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full items-center justify-center rounded-xl bg-surface-2 text-sm text-muted">
      Cargando mapa...
    </div>
  ),
});

type Props = {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
};

export default function MapView(props: Props) {
  return <Map {...props} />;
}
