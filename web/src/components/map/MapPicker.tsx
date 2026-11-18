import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  height?: string;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  lat,
  lng,
  onChange,
  height = '320px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = lat || 10.8012;
      const initialLng = lng || 106.7145;

      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color: #0891b2; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(8, 145, 178, 0.4); border: 2px solid white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: customIcon,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        onChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      mapInstanceRef.current.setView([lat, lng]);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }
  }, [lat, lng, onChange]);

  const handleCurrentLocation = () => {
    if (navigator.geolocation && mapInstanceRef.current && markerRef.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          mapInstanceRef.current?.setView([latitude, longitude], 16);
          markerRef.current?.setLatLng([latitude, longitude]);
          onChange(Number(latitude.toFixed(6)), Number(longitude.toFixed(6)));
          toast.success('Đã cập nhật tọa độ vị trí hiện tại');
        },
        () => {
          toast.warning('Không thể lấy GPS tự động. Vui lòng chấm trực tiếp trên bản đồ.');
        },
      );
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      <button
        type="button"
        onClick={handleCurrentLocation}
        className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-xs text-slate-700 hover:text-cyan-600 px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-white transition-all"
      >
        <Navigation className="w-3.5 h-3.5 text-cyan-600" />
        Vị trí của tôi
      </button>

      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-cyan-600" />
        <span>
          Vĩ độ: <strong>{lat}</strong> · Kinh độ: <strong>{lng}</strong>
        </span>
      </div>
    </div>
  );
};
