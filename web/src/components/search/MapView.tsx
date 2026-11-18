// web/src/components/search/MapView.tsx
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { Locate, ExternalLink } from "lucide-react";
import type { RoomSummaryResponse } from "../../types/room.types";
import { useNavigate } from "react-router-dom";

interface MapViewProps {
  rooms: RoomSummaryResponse[];
  selectedRoom: RoomSummaryResponse | null;
  onSelectRoom: (room: RoomSummaryResponse) => void;
  userCoords: { lat: number; lng: number } | null;
  radiusKm?: number;
  onLocateUser: () => void;
  isLocating?: boolean;
}

// 1. Hàm thông minh chuẩn hóa tọa độ (xử lý nếu kinh/vĩ độ bị lưu ngược giống mobile)
export function getValidCoords(
  room: RoomSummaryResponse
): { lat: number; lng: number } | null {
  if (!room.viDo || !room.kinhDo) return null;
  const c1 = parseFloat(room.viDo);
  const c2 = parseFloat(room.kinhDo);
  if (isNaN(c1) || isNaN(c2)) return null;

  let lat = c1;
  let lng = c2;

  // Tại Việt Nam: Vĩ độ (lat) trong khoảng [8, 24], Kinh độ (lng) trong khoảng [102, 110]
  if (c1 > 90 && c2 <= 90) {
    lat = c2;
    lng = c1;
  } else if (c2 > 90 && c1 <= 90) {
    lat = c1;
    lng = c2;
  }

  if (lat < -90 || lat > 90) return null;
  return { lat, lng };
}

export const MapView: React.FC<MapViewProps> = ({
  rooms,
  selectedRoom,
  onSelectRoom,
  userCoords,
  radiusKm,
  onLocateUser,
  isLocating = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const navigate = useNavigate();

  // Khởi tạo Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center: TP. Hồ Chí Minh (Quận 3: 10.7845, 106.6844)
    const initialLat = userCoords?.lat || 10.7845;
    const initialLng = userCoords?.lng || 106.6844;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: false,
    });

    // Thêm tile layer bản đồ sáng hiện đại
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control góc dưới bên phải
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Cập nhật User Location Marker & Radius Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userCoords) {
      // 1. User GPS Radar Marker
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
      } else {
        const userIcon = L.divIcon({
          className: "user-gps-marker",
          html: `
            <div style="position: relative; width: 20px; height: 20px;">
              <div style="position: absolute; inset: -8px; background: rgba(13, 148, 136, 0.25); border-radius: 9999px; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
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

      // 2. Radius Circle
      if (circleLayerRef.current) {
        circleLayerRef.current.remove();
        circleLayerRef.current = null;
      }

      if (radiusKm && radiusKm > 0) {
        circleLayerRef.current = L.circle([userCoords.lat, userCoords.lng], {
          radius: radiusKm * 1000,
          color: "#0d9488",
          fillColor: "#0d9488",
          fillOpacity: 0.08,
          weight: 1.5,
          dashArray: "4, 6",
        }).addTo(map);
      }
    }
  }, [userCoords, radiusKm]);

  // Vẽ các Marker giá tiền phòng
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    rooms.forEach((room) => {
      const coords = getValidCoords(room);
      if (!coords) return;

      const isSelected = selectedRoom?.maPhongTro === room.maPhongTro;
      const millions = room.giaThue ? room.giaThue / 1_000_000 : 0;
      const priceText =
        millions > 0
          ? `${millions % 1 === 0 ? millions : millions.toFixed(1)}tr`
          : "Thỏa thuận";

      const markerHtml = `
        <div class="custom-price-marker ${isSelected ? "active" : ""}">
          ${priceText}
        </div>
      `;

      const customIcon = L.divIcon({
        className: "",
        html: markerHtml,
        iconSize: [60, 28],
        iconAnchor: [30, 14],
      });

      const marker = L.marker([coords.lat, coords.lng], {
        icon: customIcon,
        zIndexOffset: isSelected ? 500 : 100,
      });

      marker.on("click", () => {
        onSelectRoom(room);
      });

      markersLayer.addLayer(marker);
    });
  }, [rooms, selectedRoom]);

  // Khi selectedRoom thay đổi, pan nhẹ đến tọa độ phòng
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedRoom) return;

    const coords = getValidCoords(selectedRoom);
    if (coords) {
      map.panTo([coords.lat, coords.lng], {
        animate: true,
        duration: 0.6,
      });
    }
  }, [selectedRoom]);

  const formatPrice = (price: number) => {
    if (!price || price <= 0) return "Thỏa thuận";
    if (price >= 1_000_000) {
      const millions = price / 1_000_000;
      return `${millions % 1 === 0 ? millions : millions.toFixed(1)} triệu/tháng`;
    }
    return `${price.toLocaleString("vi-VN")} đ/tháng`;
  };

  const previewImage =
    selectedRoom?.anhDaiDien ||
    (selectedRoom?.hinhAnh && selectedRoom.hinhAnh.length > 0
      ? selectedRoom.hinhAnh[0].duongDan
      : null) ||
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500";

  const previewTitle =
    selectedRoom?.tieuDe ||
    `${selectedRoom?.tenLoaiPhong || "Phòng trọ"} - ${selectedRoom?.diaChi.split(",")[0] || ""}`;

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Nút GPS định vị vị trí hiện tại */}
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={onLocateUser}
          disabled={isLocating}
          title="Định vị vị trí hiện tại của tôi"
          className="w-11 h-11 rounded-2xl bg-white shadow-lg border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-teal-700 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
        >
          <Locate
            className={`w-5 h-5 ${isLocating ? "animate-spin text-teal-600" : ""}`}
          />
        </button>
      </div>

      {/* Floating Bottom Preview Card (Khớp chính xác với hình 2) */}
      {selectedRoom && (
        <div className="absolute bottom-6 left-6 right-6 sm:right-auto sm:w-96 z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            onClick={() => navigate(`/room/${selectedRoom.maPhongTro}`)}
            className="group bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3 flex items-center gap-3.5 cursor-pointer hover:border-teal-500 transition-all backdrop-blur-md bg-white/95"
          >
            {/* Ảnh đại diện phòng */}
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
              <img
                src={previewImage}
                alt={previewTitle}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Chi tiết phòng */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[11px] font-bold">
                  Đang chọn
                </span>
                <span className="text-[11px] text-slate-400">
                  {selectedRoom.dienTich} m²
                </span>
              </div>

              <h4 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-teal-700 transition-colors">
                {previewTitle}
              </h4>

              <p className="text-sm font-extrabold text-teal-700 mt-1">
                {formatPrice(selectedRoom.giaThue)}
              </p>
            </div>

            {/* Link Xem chi tiết */}
            <div className="shrink-0 pl-1 text-slate-400 group-hover:text-teal-600 transition-colors">
              <ExternalLink className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
