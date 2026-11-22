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

const createInnFinderMarkerIcon = () => {
  return L.divIcon({
    className: 'innfinder-map-pin',
    html: `
      <div style="filter: drop-shadow(0 4px 8px rgba(17, 138, 126, 0.5)); cursor: grab; transition: transform 0.15s ease;" title="Kéo để chỉnh vị trí phòng">
        <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 6C29.5 6 13 22.5 13 43C13 66.8 44.2 91.2 48.1 94.2C49.2 95.1 50.8 95.1 51.9 94.2C55.8 91.2 87 66.8 87 43C87 22.5 70.5 6 50 6Z" fill="#118A7E" stroke="#FFFFFF" stroke-width="2.5"/>
          <path d="M50 22L23 44.5L28.2 49.8L50 31.6L71.8 49.8L77 44.5L68 37V25.5H60.5V30.8L50 22Z" fill="#FFFFFF"/>
          <path d="M32.5 48.5V67.5H44V55.5C44 52.2 46.7 49.5 50 49.5C53.3 49.5 56 52.2 56 55.5V67.5H67.5V48.5L50 34L32.5 48.5Z" fill="#FFFFFF"/>
        </svg>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 40],
  });
};

export const MapPicker: React.FC<MapPickerProps> = ({
  lat,
  lng,
  onChange,
  height = '340px',
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

      const customIcon = createInnFinderMarkerIcon();

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
      const currentPos = markerRef.current?.getLatLng();
      const distance = currentPos ? currentPos.distanceTo([lat, lng]) : 0;
      if (distance > 5) {
        mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 0.8 });
        markerRef.current?.setLatLng([lat, lng]);
      }
    }
  }, [lat, lng, onChange]);

  const handleCurrentLocation = () => {
    if (navigator.geolocation && mapInstanceRef.current && markerRef.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          mapInstanceRef.current?.flyTo([latitude, longitude], 16);
          markerRef.current?.setLatLng([latitude, longitude]);
          onChange(Number(latitude.toFixed(6)), Number(longitude.toFixed(6)));
          toast.success('Đã cập nhật vị trí hiện tại');
        },
        () => {
          toast.warning('Không thể lấy GPS tự động. Vui lòng chấm trực tiếp trên bản đồ.');
        },
      );
    }
  };

  return (
    <div className="relative z-0 rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      <button
        type="button"
        onClick={handleCurrentLocation}
        className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-xs text-slate-700 hover:text-teal-700 px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-white transition-all"
      >
        <Navigation className="w-3.5 h-3.5 text-teal-600" />
        Vị trí của tôi
      </button>

      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
        <span className="font-medium text-slate-700">
          Kéo ghim hoặc click trên bản đồ để tinh chỉnh vị trí
        </span>
      </div>
    </div>
  );
};
