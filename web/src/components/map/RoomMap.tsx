import React, { useEffect, useEffectEvent, useRef } from 'react';
import L from 'leaflet';
import { ExternalLink, Locate, Radar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RoomSummaryResponse } from '@/types/room.types';
import { formatVNDShort, getValidCoords } from '@/utils/formatters';

interface Camera {
  lat: number;
  lng: number;
  zoom: number;
}

interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface MapViewport extends Camera {
  bounds: Bounds;
}

interface FitRequest {
  lat: number;
  lng: number;
  radius?: number;
  bounds?: Bounds;
}

export interface RoomMapProps {
  rooms: RoomSummaryResponse[];
  selectedRoom?: RoomSummaryResponse | null;
  hoveredRoomId?: string | null;
  onSelectRoom?: (room: RoomSummaryResponse) => void;
  onHoverRoom?: (roomId: string | null) => void;
  userCoords?: { lat: number; lng: number } | null;
  radiusKm?: number;
  onRadiusChange?: (radiusKm: number) => void;
  onLocateUser?: () => void;
  isLocating?: boolean;
  interactivePreview?: boolean;
  searchCenter?: { lat: number; lng: number } | null;
  camera?: Camera | null;
  fit?: FitRequest | null;
  resultKey?: string;
  panToSelection?: boolean;
  onViewport?: (viewport: MapViewport, persist: boolean) => void;
  onSearchViewport?: () => void;
}

export const RoomMap: React.FC<RoomMapProps> = ({
  rooms,
  selectedRoom = null,
  hoveredRoomId = null,
  onSelectRoom,
  onHoverRoom,
  userCoords = null,
  radiusKm,
  onRadiusChange,
  onLocateUser,
  isLocating = false,
  interactivePreview = true,
  searchCenter,
  camera,
  fit,
  resultKey,
  panToSelection = true,
  onViewport,
  onSearchViewport,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const roomMarkers = useRef(new Map<string, L.Marker>());
  const selectMarker = useEffectEvent((room: RoomSummaryResponse) => onSelectRoom?.(room));
  const hoverMarker = useEffectEvent((id: string | null) => onHoverRoom?.(id));
  const hasPannedToInitialRef = useRef(false);
  const navigate = useNavigate();

  const searchMap = Boolean(onSearchViewport);
  const appliedFit = useRef<FitRequest | null>(null);
  const fittedResults = useRef<string | null>(null);
  const movingProgrammatically = useRef(false);
  const circleLat = searchMap ? searchCenter?.lat : userCoords?.lat;
  const circleLng = searchMap ? searchCenter?.lng : userCoords?.lng;
  const circleRadius = radiusKm ?? (searchMap ? undefined : 2);

  const reportViewport = useEffectEvent((map: L.Map, persist: boolean) => {
    const center = map.getCenter().wrap();
    const { lat, lng } = center;
    const bounds = map.getBounds();
    const fullWorld = bounds.getEast() - bounds.getWest() >= 360;
    onViewport?.({
      lat, lng, zoom: map.getZoom(),
      bounds: {
        south: Math.max(-90, bounds.getSouth()), north: Math.min(90, bounds.getNorth()),
        west: fullWorld ? -180 : bounds.getSouthWest().wrap().lng,
        east: fullWorld ? 180 : bounds.getNorthEast().wrap().lng,
      },
    }, persist);
  });

  const syncCamera = useEffectEvent((map: L.Map) => {
    if (!searchMap || !map.getSize().x || !map.getSize().y) return;
    movingProgrammatically.current = true;
    try {
      if (fit && appliedFit.current !== fit) {
        appliedFit.current = fit;
        fittedResults.current = resultKey ?? null;
        const measurement = fit.bounds ? null
          : L.circle([fit.lat, fit.lng], { radius: (fit.radius ?? 1) * 1000 }).addTo(map);
        const bounds = fit.bounds
          ? L.latLngBounds([fit.bounds.south, fit.bounds.west], [fit.bounds.north, fit.bounds.east])
          : measurement!.getBounds();
        measurement?.remove();
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16, animate: false });
        reportViewport(map, true);
      } else if (camera) {
        fittedResults.current = resultKey ?? null;
        if (!map.getCenter().wrap().equals([camera.lat, camera.lng]) || map.getZoom() !== camera.zoom) {
          map.setView([camera.lat, camera.lng], camera.zoom, { animate: false });
        }
      } else if (resultKey !== undefined && fittedResults.current !== resultKey && !searchCenter) {
        const positions = rooms.flatMap(room => {
          const coords = getValidCoords(room);
          return coords ? [[coords.lat, coords.lng] as [number, number]] : [];
        });
        if (positions.length) {
          fittedResults.current = resultKey;
          map.fitBounds(positions, { padding: [36, 36], maxZoom: 15, animate: false });
          reportViewport(map, true);
        }
      }
    } finally {
      movingProgrammatically.current = false;
    }
  });

  const userLat = userCoords?.lat;
  const userLng = userCoords?.lng;

  const initialCoordsRef = useRef<[number, number]>([
    camera?.lat ?? userCoords?.lat ?? (rooms[0] ? getValidCoords(rooms[0])?.lat : null) ?? 21.0285,
    camera?.lng ?? userCoords?.lng ?? (rooms[0] ? getValidCoords(rooms[0])?.lng : null) ?? 105.8542,
  ]);

  // 1. Khởi tạo bản đồ Leaflet một lần duy nhất khi mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: initialCoordsRef.current,
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

    const moved = () => reportViewport(map, !movingProgrammatically.current);
    map.on('moveend', moved);
    const resizeObserver = new ResizeObserver(() => {
      movingProgrammatically.current = true;
      map.invalidateSize({ pan: false });
      movingProgrammatically.current = false;
      syncCamera(map);
      reportViewport(map, false);
    });
    resizeObserver.observe(mapContainerRef.current);
    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      userMarkerRef.current = null;
      circleLayerRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map) syncCamera(map);
  }, [camera?.lat, camera?.lng, camera?.zoom, fit, rooms, resultKey]);

  // 2. Căn giữa bản đồ vào vị trí người dùng khi vừa xác định được tọa độ lần đầu
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || searchMap || userLat === undefined || userLng === undefined) return;

    if (!hasPannedToInitialRef.current) {
      hasPannedToInitialRef.current = true;
      map.setView([userLat, userLng], 14);
    }
  }, [searchMap, userLat, userLng]);

  // 3. Tự động tính bán kính quét sao cho vòng tròn LUÔN HIỂN THỊ TRỌN VẸN 100% trong khung nhìn bản đồ
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !onRadiusChange) return;

    const calculateDynamicRadius = () => {
      const bounds = map.getBounds();
      const center =
        userLat !== undefined && userLng !== undefined
          ? L.latLng(userLat, userLng)
          : map.getCenter();

      // Tính khoảng cách từ tâm tới 4 cạnh của khung nhìn (Bắc, Nam, Đông, Tây)
      const distNorth = center.distanceTo(L.latLng(bounds.getNorth(), center.lng));
      const distSouth = center.distanceTo(L.latLng(bounds.getSouth(), center.lng));
      const distEast = center.distanceTo(L.latLng(center.lat, bounds.getEast()));
      const distWest = center.distanceTo(L.latLng(center.lat, bounds.getWest()));

      // Khoảng cách ngắn nhất từ tâm tới mép khung nhìn (thường là chiều dọc màn hình)
      const minEdgeDistance = Math.min(distNorth, distSouth, distEast, distWest);

      // Lấy 68% khoảng cách ngắn nhất để vòng tròn luôn nằm trọn vẹn lọt lòng trong khung hình, không bị cắt xén
      const safeRadiusMeters = minEdgeDistance * 0.68;

      // Quy đổi ra km thân thiện (ví dụ 1km, 1.5km, 2km, 2.5km, 3km...) vừa tầm mắt người dùng
      const rawKm = safeRadiusMeters / 1000;
      let calculatedKm: number;
      if (rawKm < 1) {
        calculatedKm = Math.max(0.5, Math.round(rawKm * 10) / 10);
      } else if (rawKm <= 5) {
        calculatedKm = Math.round(rawKm * 2) / 2; // Bước nhảy 0.5 km: 1.5, 2.0, 2.5...
      } else {
        calculatedKm = Math.round(rawKm); // Bước nhảy 1 km: 6, 7, 8...
      }

      onRadiusChange(calculatedKm);
    };

    calculateDynamicRadius();

    map.on('zoomend', calculateDynamicRadius);
    map.on('moveend', calculateDynamicRadius);

    return () => {
      map.off('zoomend', calculateDynamicRadius);
      map.off('moveend', calculateDynamicRadius);
    };
  }, [userLat, userLng, onRadiusChange]);

  // 4. Render CHẤM TRÒN XANH vị trí hiện tại của khách hàng (Chuẩn Teal & Pulse animation)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || userLat === undefined || userLng === undefined) return;

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
          <div class="user-pulse-ring" style="position: absolute; inset: -10px; background: rgba(13, 148, 136, 0.35); border-radius: 9999px;"></div>
          <div style="position: absolute; inset: 2px; background: #0d9488; border: 3px solid #ffffff; border-radius: 9999px; box-shadow: 0 0 12px rgba(13, 148, 136, 0.7), 0 3px 8px rgba(0,0,0,0.35);"></div>
          <div style="position: absolute; width: 7px; height: 7px; background: #ffffff; border-radius: 9999px;"></div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
      userMarkerRef.current.setIcon(userIcon);
    } else {
      userMarkerRef.current = L.marker([userLat, userLng], {
        icon: userIcon,
        zIndexOffset: 1000,
        title: 'Vị trí hiện tại của bạn',
      }).addTo(map);

      userMarkerRef.current.bindTooltip('Vị trí hiện tại của bạn', {
        permanent: false,
        direction: 'top',
        offset: [0, -12],
        className: 'user-location-tooltip',
      });
    }
  }, [userLat, userLng]);

  // 5. Render VÒNG TRÒN XANH quét bán kính phòng trọ (Đảm bảo luôn là hình tròn trọn vẹn trong khung hình)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (circleLat === undefined || circleLng === undefined || !circleRadius) {
      circleLayerRef.current?.remove();
      circleLayerRef.current = null;
      return;
    }
    const effectiveRadius = circleRadius * 1000;

    if (circleLayerRef.current) {
      circleLayerRef.current.setLatLng([circleLat, circleLng]);
      circleLayerRef.current.setRadius(effectiveRadius);
    } else {
      circleLayerRef.current = L.circle([circleLat, circleLng], {
        radius: effectiveRadius,
        color: '#0d9488',
        fillColor: '#0d9488',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '6, 8',
      }).addTo(map);
    }
  }, [circleLat, circleLng, circleRadius]);

  // 6. Cập nhật các marker giá phòng trên bản đồ
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    roomMarkers.current.clear();
    rooms.forEach(room => {
      const coords = getValidCoords(room);
      if (!coords) return;

      const millions = room.giaThue ? room.giaThue / 1_000_000 : 0;
      const price = millions > 0 ? `${millions % 1 === 0 ? millions : millions.toFixed(1)}tr` : 'Xem';
      const marker = L.marker([coords.lat, coords.lng], {
        title: room.tieuDe || price,
        icon: L.divIcon({
          className: '',
          html: `<div class="custom-price-marker">${price}</div>`,
          iconSize: [64, 30],
          iconAnchor: [32, 15],
        }),
      });
      marker.on('click', () => selectMarker(room));
      marker.on('mouseover', () => hoverMarker(room.maPhongTro));
      marker.on('mouseout', () => hoverMarker(null));
      roomMarkers.current.set(room.maPhongTro, marker);
      markersLayer.addLayer(marker);
    });
  }, [rooms]);

  const selectedRoomId = selectedRoom?.maPhongTro;
  useEffect(() => {
    roomMarkers.current.forEach((marker, id) => {
      const selected = selectedRoomId === id;
      const hovered = hoveredRoomId === id;
      const element = marker.getElement()?.firstElementChild;
      element?.classList.toggle('active', selected);
      element?.classList.toggle('hovered', hovered);
      marker.setZIndexOffset(selected || hovered ? 600 : 100);
    });
  }, [rooms, selectedRoomId, hoveredRoomId]);

  // 7. Lướt bản đồ khi người dùng chọn phòng từ danh sách
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedRoom || !panToSelection) return;
    const coords = getValidCoords(selectedRoom);
    if (coords) {
      map.panTo([coords.lat, coords.lng], { animate: true, duration: 0.6 });
    }
  }, [selectedRoom, panToSelection]);

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
    <div className="relative w-full h-full min-h-[300px]">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {circleRadius && circleLat !== undefined && (
        <div className="absolute top-3 left-3 z-10 pointer-events-none bg-white/95 px-3 py-1.5 rounded-xl shadow-md flex items-center gap-2 text-xs font-semibold">
          <Radar className="w-3.5 h-3.5 text-teal-600" />
          <span>Bán kính quét: {circleRadius} km</span>
        </div>
      )}
      {onSearchViewport && (
        <button type="button" onClick={onSearchViewport}
          className="absolute top-14 left-3 z-10 bg-white px-3 py-2 rounded-xl shadow-md text-sm font-semibold">
          Tìm trong vùng bản đồ
        </button>
      )}

      {/* Nút định vị GPS của người dùng */}
      {onLocateUser && (
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={onLocateUser}
            disabled={isLocating}
            aria-label="Định vị vị trí hiện tại của tôi"
            title="Định vị vị trí hiện tại của tôi"
            className="w-10 h-10 rounded-xl bg-white shadow-lg border border-slate-200/90 flex items-center justify-center text-slate-700 hover:text-teal-600 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Locate className={`w-5 h-5 ${isLocating ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      )}

      {/* Thẻ xem trước thông tin phòng trọ đang chọn */}
      {interactivePreview && selectedRoom && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-88 z-10 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            onClick={() => navigate(`/room/${selectedRoom.maPhongTro}`)}
            className="group bg-white/95 rounded-2xl shadow-xl border border-slate-200/90 p-2.5 flex items-center gap-3 cursor-pointer hover:border-teal-500 transition-all backdrop-blur-md"
          >
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
              <img
                src={previewImage}
                alt={previewTitle}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[10px] font-bold">
                  Đang chọn
                </span>
                <span className="text-[10px] text-slate-400">{selectedRoom.dienTich} m²</span>
              </div>

              <h4 className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-teal-700 transition-colors">
                {previewTitle}
              </h4>

              <p className="text-xs font-extrabold text-teal-700 mt-0.5">
                {formatVNDShort(selectedRoom.giaThue)}
              </p>
            </div>

            <div className="shrink-0 pl-1 text-slate-400 group-hover:text-teal-600 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MapView = RoomMap;
