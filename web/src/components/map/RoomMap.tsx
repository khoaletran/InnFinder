import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ExternalLink, Locate } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RoomSummaryResponse } from '@/types/room.types';
import { formatVNDShort, getValidCoords } from '@/utils/formatters';

export interface RoomMapProps {
  rooms: RoomSummaryResponse[];
  selectedRoom?: RoomSummaryResponse | null;
  hoveredRoomId?: string | null;
  onSelectRoom?: (room: RoomSummaryResponse) => void;
  onHoverRoom?: (roomId: string | null) => void;
  userCoords?: { lat: number; lng: number } | null;
  radiusKm?: number;
  onLocateUser?: () => void;
  isLocating?: boolean;
  interactivePreview?: boolean;
}

export const RoomMap: React.FC<RoomMapProps> = ({
  rooms,
  selectedRoom = null,
  hoveredRoomId = null,
  onSelectRoom,
  onHoverRoom,
  userCoords = null,
  radiusKm,
  onLocateUser,
  isLocating = false,
  interactivePreview = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const firstCoords = rooms[0] ? getValidCoords(rooms[0]) : null;
    const initialLat = userCoords?.lat || firstCoords?.lat || 10.7845;
    const initialLng = userCoords?.lng || firstCoords?.lng || 106.6844;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [rooms, userCoords]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userCoords) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
      } else {
        const userIcon = L.divIcon({
          className: 'user-gps-marker',
          html: `
            <div style="position: relative; width: 20px; height: 20px;">
              <div style="position: absolute; inset: -8px; background: rgba(13, 148, 136, 0.25); border-radius: 9999px;"></div>
              <div style="position: absolute; inset: 0; background: #0d9488; border: 3px solid white; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(map);
      }

      if (circleLayerRef.current) {
        circleLayerRef.current.remove();
        circleLayerRef.current = null;
      }

      if (radiusKm && radiusKm > 0) {
        circleLayerRef.current = L.circle([userCoords.lat, userCoords.lng], {
          radius: radiusKm * 1000,
          color: '#0d9488',
          fillColor: '#0d9488',
          fillOpacity: 0.08,
          weight: 1.5,
          dashArray: '4, 6',
        }).addTo(map);
      }
    }
  }, [userCoords, radiusKm]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    rooms.forEach((room) => {
      const coords = getValidCoords(room);
      if (!coords) return;

      const isSelected = selectedRoom?.maPhongTro === room.maPhongTro;
      const isHovered = hoveredRoomId === room.maPhongTro;
      const millions = room.giaThue ? room.giaThue / 1_000_000 : 0;
      const priceText =
        millions > 0 ? `${millions % 1 === 0 ? millions : millions.toFixed(1)}tr` : 'Xem';

      const customIcon = L.divIcon({
        className: '',
        html: `<div class="custom-price-marker ${isSelected ? 'active' : ''} ${isHovered ? 'hovered' : ''}">${priceText}</div>`,
        iconSize: [64, 30],
        iconAnchor: [32, 15],
      });

      const marker = L.marker([coords.lat, coords.lng], {
        icon: customIcon,
        zIndexOffset: isSelected || isHovered ? 600 : 100,
      });

      if (onSelectRoom) {
        marker.on('click', () => onSelectRoom(room));
      }
      if (onHoverRoom) {
        marker.on('mouseover', () => onHoverRoom(room.maPhongTro));
        marker.on('mouseout', () => onHoverRoom(null));
      }

      markersLayer.addLayer(marker);
    });
  }, [rooms, selectedRoom, hoveredRoomId, onSelectRoom, onHoverRoom]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedRoom) return;
    const coords = getValidCoords(selectedRoom);
    if (coords) {
      map.panTo([coords.lat, coords.lng], { animate: true, duration: 0.6 });
    }
  }, [selectedRoom]);

  const previewImage =
    selectedRoom?.anhDaiDien ||
    (selectedRoom?.hinhAnh && selectedRoom.hinhAnh.length > 0
      ? selectedRoom.hinhAnh[0].duongDan
      : null) ||
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500';

  const previewTitle =
    selectedRoom?.tieuDe ||
    `${selectedRoom?.tenLoaiPhong || 'Phòng trọ'} - ${selectedRoom?.diaChi.split(',')[0] || ''}`;

  return (
    <div className="relative w-full h-full min-h-[260px]">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {onLocateUser && (
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={onLocateUser}
            disabled={isLocating}
            title="Định vị vị trí hiện tại của tôi"
            className="w-11 h-11 rounded-2xl bg-white shadow-lg border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-teal-700 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Locate className={`w-5 h-5 ${isLocating ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      )}

      {interactivePreview && selectedRoom && (
        <div className="absolute bottom-6 left-6 right-6 sm:right-auto sm:w-96 z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            onClick={() => navigate(`/room/${selectedRoom.maPhongTro}`)}
            className="group bg-white/95 rounded-2xl shadow-xl border border-slate-200/90 p-3 flex items-center gap-3.5 cursor-pointer hover:border-teal-500 transition-all backdrop-blur-md"
          >
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
              <img
                src={previewImage}
                alt={previewTitle}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[11px] font-bold">
                  Đang chọn
                </span>
                <span className="text-[11px] text-slate-400">{selectedRoom.dienTich} m²</span>
              </div>

              <h4 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-teal-700 transition-colors">
                {previewTitle}
              </h4>

              <p className="text-sm font-extrabold text-teal-700 mt-1">
                {formatVNDShort(selectedRoom.giaThue)}
              </p>
            </div>

            <div className="shrink-0 pl-1 text-slate-400 group-hover:text-teal-600 transition-colors">
              <ExternalLink className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MapView = RoomMap;
