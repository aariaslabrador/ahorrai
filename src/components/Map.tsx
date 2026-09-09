"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Los bundlers rompen las rutas por defecto de los iconos de Leaflet; se
// reemplazan por las del CDN de unpkg para no tener que copiar assets.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  href?: string;
};

type Props = {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
};

function ClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (markers.length > 1) {
      map.fitBounds(markers.map((m) => [m.lat, m.lng]), { padding: [32, 32] });
    }
  }, [map, markers]);
  return null;
}

const DEFAULT_CENTER: [number, number] = [40.4168, -3.7038]; // Madrid

export default function Map({ markers, center, zoom = 13, className, onMapClick }: Props) {
  const mapCenter = center ?? (markers[0] ? [markers[0].lat, markers[0].lng] : DEFAULT_CENTER);

  return (
    <MapContainer
      center={mapCenter as [number, number]}
      zoom={zoom}
      scrollWheelZoom
      className={className ?? "h-96 w-full rounded-xl"}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]}>
          <Popup>
            {m.href ? (
              <a href={m.href} className="font-medium text-emerald-700">
                {m.label}
              </a>
            ) : (
              m.label
            )}
          </Popup>
        </Marker>
      ))}
      {markers.length > 1 && <FitBounds markers={markers} />}
      <ClickHandler onMapClick={onMapClick} />
    </MapContainer>
  );
}
