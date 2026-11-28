import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ExternalLink, Locate, MapPin, Minus, Plus, Radar, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import innFinderPin from '@/assets/innfinder-pin.svg';
import type { RoomSummaryResponse } from '@/types/room.types';
import { formatVNDShort, getValidCoords } from '@/utils/formatters';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapDestination {
  id: string;
  label: string;
  lat: number;
  lng: number;
  color?: string;
  routeCoords?: [number, number][];
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
  showUserScanCircle?: boolean;
  onLocateUser?: () => void;
  isLocating?: boolean;
  locateTrigger?: number;
  interactivePreview?: boolean;
  showRadiusBadge?: boolean;
  pickedCoords?: { lat: number; lng: number } | null;
  pickedRadiusKm?: number;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  onClearPickedCoords?: () => void;
  markerStyle?: 'price' | 'brand';
  initialViewport?: { lat: number; lng: number; zoom: number } | null;
  onViewportChange?: (viewport: { lat: number; lng: number; zoom: number }) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  focusTarget?: { lat: number; lng: number; zoom?: number; seq: number } | null;
  destinations?: MapDestination[];
  activeDestinationId?: string | null;
  onSelectDestination?: (id: string) => void;
}

export const RoomMap: React.FC<RoomMapProps> = ({
  rooms,
  selectedRoom = null,
  hoveredRoomId = null,
  onSelectRoom,
  onHoverRoom,
  userCoords = null,
  radiusKm = 2,
  onRadiusChange,
  showUserScanCircle = false,
  onLocateUser,
  isLocating = false,
  locateTrigger = 0,
  interactivePreview = true,
  showRadiusBadge,
  pickedCoords = null,
  pickedRadiusKm = 15,
  onMapClick,
  onClearPickedCoords,
  markerStyle = 'price',
  initialViewport = null,
  onViewportChange,
  onBoundsChange,
  focusTarget = null,
  destinations = [],
  activeDestinationId = null,
  onSelectDestination,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const pickedCircleRef = useRef<L.Circle | null>(null);
  const pickedMarkerRef = useRef<L.Marker | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const onViewportChangeRef = useRef(onViewportChange);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const hasPannedToInitialRef = useRef(Boolean(initialViewport));
  const navigate = useNavigate();

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  const userLat = userCoords?.lat;
  const userLng = userCoords?.lng;
  const pickedLat = pickedCoords?.lat;
  const pickedLng = pickedCoords?.lng;

  const initialCoordsRef = useRef<[number, number]>([
    initialViewport?.lat ??
      userCoords?.lat ??
      (rooms[0] ? getValidCoords(rooms[0])?.lat : undefined) ??
      21.0285,
    initialViewport?.lng ??
      userCoords?.lng ??
      (rooms[0] ? getValidCoords(rooms[0])?.lng : undefined) ??
      105.8542,
  ]);
  const initialZoomRef = useRef<number>(
    initialViewport?.zoom ?? (rooms.length === 1 && !userCoords ? 16 : 14),
  );
  const shouldShowRadiusBadge = Boolean(showRadiusBadge);

  // 1. Khởi tạo bản đồ Leaflet một lần duy nhất khi mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: initialCoordsRef.current,
      zoom: initialZoomRef.current,
      zoomControl: false,
    });

    L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; Google Maps',
      maxZoom: 20,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    const routesLayer = L.layerGroup().addTo(map);
    routesLayerRef.current = routesLayer;
    mapInstanceRef.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    const syncBounds = () => {
      const bounds = map.getBounds();
      onBoundsChangeRef.current?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    };

    const syncViewport = () => {
      const center = map.getCenter();
      onViewportChangeRef.current?.({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
      });
      syncBounds();
    };

    syncBounds();

    map.on('moveend', syncViewport);
    map.on('zoomend', syncViewport);

    // Đảm bảo Leaflet tính toán chuẩn tỷ lệ khung hình 1:1 ngay khi render
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
      syncBounds();
    }, 200);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
      syncBounds();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      userMarkerRef.current = null;
      circleLayerRef.current = null;
      pickedMarkerRef.current = null;
      pickedCircleRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // 2. Căn giữa bản đồ vào vị trí người dùng khi vừa xác định được tọa độ hoặc khi bấm nút "Vị trí của tôi"
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || userLat === undefined || userLng === undefined) return;

    if (!hasPannedToInitialRef.current) {
      hasPannedToInitialRef.current = true;
      map.setView([userLat, userLng], 14);
    } else if (locateTrigger > 0) {
      map.flyTo([userLat, userLng], Math.max(map.getZoom(), 14), {
        animate: true,
        duration: 0.75,
      });
    }
  }, [userLat, userLng, locateTrigger]);

  // 2b. Di chuyển bản đồ tới địa điểm người dùng chọn từ thanh tìm kiếm vị trí
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusTarget) return;
    map.flyTo([focusTarget.lat, focusTarget.lng], focusTarget.zoom ?? 14, {
      animate: true,
      duration: 0.75,
    });
  }, [focusTarget]);

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
    if (!map) return;

    if (userLat === undefined || userLng === undefined) {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }

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

  // 5. Render VÒNG TRÒN XANH quét bán kính phòng trọ quanh người dùng (chỉ hiển thị khi bật showUserScanCircle)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!showUserScanCircle || userLat === undefined || userLng === undefined) {
      if (circleLayerRef.current) {
        map.removeLayer(circleLayerRef.current);
        circleLayerRef.current = null;
      }
      return;
    }

    const effectiveRadius = (radiusKm && radiusKm > 0 ? radiusKm : 2) * 1000;

    if (circleLayerRef.current) {
      circleLayerRef.current.setLatLng([userLat, userLng]);
      circleLayerRef.current.setRadius(effectiveRadius);
    } else {
      circleLayerRef.current = L.circle([userLat, userLng], {
        radius: effectiveRadius,
        color: '#0d9488',
        fillColor: '#0d9488',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '6, 8',
      }).addTo(map);
    }
  }, [showUserScanCircle, userLat, userLng, radiusKm]);

  // 5b. Render điểm chọn thêm trên bản đồ + vòng tròn quét 15 km bổ sung
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pickedLat === undefined || pickedLng === undefined) {
      if (pickedMarkerRef.current) {
        map.removeLayer(pickedMarkerRef.current);
        pickedMarkerRef.current = null;
      }
      if (pickedCircleRef.current) {
        map.removeLayer(pickedCircleRef.current);
        pickedCircleRef.current = null;
      }
      return;
    }

    const pickedIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
          <div style="position: absolute; inset: -8px; background: rgba(37, 99, 235, 0.25); border-radius: 9999px;"></div>
          <div style="position: absolute; inset: 2px; background: #2563eb; border: 3px solid #ffffff; border-radius: 9999px; box-shadow: 0 0 12px rgba(37, 99, 235, 0.55), 0 3px 8px rgba(0,0,0,0.3);"></div>
          <div style="position: absolute; width: 6px; height: 6px; background: #ffffff; border-radius: 9999px;"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (pickedMarkerRef.current) {
      pickedMarkerRef.current.setLatLng([pickedLat, pickedLng]);
      pickedMarkerRef.current.setIcon(pickedIcon);
      pickedMarkerRef.current.setTooltipContent(`Điểm quét thêm (${pickedRadiusKm} km)`);
    } else {
      pickedMarkerRef.current = L.marker([pickedLat, pickedLng], {
        icon: pickedIcon,
        zIndexOffset: 950,
        title: `Điểm quét thêm (${pickedRadiusKm} km)`,
      }).addTo(map);

      pickedMarkerRef.current.bindTooltip(`Điểm quét thêm (${pickedRadiusKm} km)`, {
        permanent: false,
        direction: 'top',
        offset: [0, -12],
        className: 'user-location-tooltip',
      });
    }

    const effectivePickedRadius = pickedRadiusKm * 1000;
    if (pickedCircleRef.current) {
      pickedCircleRef.current.setLatLng([pickedLat, pickedLng]);
      pickedCircleRef.current.setRadius(effectivePickedRadius);
    } else {
      pickedCircleRef.current = L.circle([pickedLat, pickedLng], {
        radius: effectivePickedRadius,
        color: '#2563eb',
        fillColor: '#2563eb',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '6, 8',
      }).addTo(map);
    }
  }, [pickedLat, pickedLng, pickedRadiusKm]);

  // 6. Cập nhật các marker giá phòng trên bản đồ
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const hasPickedZone =
      pickedLat !== undefined && pickedLng !== undefined && pickedRadiusKm > 0;
    const hasLegacyUserZone =
      showUserScanCircle &&
      userLat !== undefined &&
      userLng !== undefined &&
      radiusKm > 0;
    const hasAnyScanZone = hasPickedZone || hasLegacyUserZone;

    rooms.forEach((room) => {
      const coords = getValidCoords(room);
      if (!coords) return;

      // Khi chọn điểm quét thêm (hoặc bật vòng quét người dùng), lọc marker theo vòng tròn tương ứng; mặc định hiển thị toàn bộ phòng trong khung nhìn
      if (hasAnyScanZone) {
        const roomLatLng = L.latLng(coords.lat, coords.lng);
        const inUserZone =
          hasLegacyUserZone &&
          userLat !== undefined &&
          userLng !== undefined &&
          L.latLng(userLat, userLng).distanceTo(roomLatLng) <= radiusKm * 1000;
        const inPickedZone =
          hasPickedZone &&
          pickedLat !== undefined &&
          pickedLng !== undefined &&
          L.latLng(pickedLat, pickedLng).distanceTo(roomLatLng) <= pickedRadiusKm * 1000;
        if (!inUserZone && !inPickedZone) return;
      }

      const isSelected = selectedRoom?.maPhongTro === room.maPhongTro;
      const isHovered = hoveredRoomId === room.maPhongTro;
      const millions = room.giaThue ? room.giaThue / 1_000_000 : 0;
      const priceText =
        millions > 0 ? `${millions % 1 === 0 ? millions : millions.toFixed(1)}tr` : 'Xem';

      const houseIconSvg = `<svg class="custom-price-marker-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;

      const customIcon = L.divIcon({
        className: 'custom-price-marker-wrapper',
        html: `<div class="custom-price-marker ${isSelected ? 'active' : ''} ${isHovered ? 'hovered' : ''}">${houseIconSvg}<span>${priceText}</span></div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([coords.lat, coords.lng], {
        icon: markerStyle === 'brand' ? L.icon({
          iconUrl: innFinderPin,
          iconSize: [44, 44],
          iconAnchor: [22, 42],
        }) : customIcon,
        alt: markerStyle === 'brand' ? 'Vị trí phòng trên bản đồ' : priceText,
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
  }, [
    rooms,
    selectedRoom,
    hoveredRoomId,
    onSelectRoom,
    onHoverRoom,
    showUserScanCircle,
    userLat,
    userLng,
    radiusKm,
    pickedLat,
    pickedLng,
    pickedRadiusKm,
    markerStyle,
  ]);

  // 7. Lướt bản đồ khi người dùng chọn phòng từ danh sách
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedRoom || destinations.length > 0) return;
    const coords = getValidCoords(selectedRoom);
    if (coords) {
      map.panTo([coords.lat, coords.lng], { animate: true, duration: 0.6 });
    }
  }, [selectedRoom, destinations.length]);

  // 8. Hiển thị các điểm đến & tuyến đường thực tế từ phòng trọ
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routesLayer = routesLayerRef.current;
    if (!map || !routesLayer) return;

    routesLayer.clearLayers();
    if (destinations.length === 0) return;

    const boundsPoints: L.LatLngExpression[] = [];
    const roomCoords = selectedRoom ? getValidCoords(selectedRoom) : null;
    if (roomCoords) {
      boundsPoints.push([roomCoords.lat, roomCoords.lng]);
    }

    destinations.forEach((dest, index) => {
      const color = dest.color || '#2563eb';
      const isActive = dest.id === activeDestinationId || destinations.length === 1;

      if (dest.routeCoords && dest.routeCoords.length >= 2) {
        const line = L.polyline(dest.routeCoords, {
          color,
          weight: isActive ? 5 : 3,
          opacity: isActive ? 0.9 : 0.35,
          dashArray: isActive ? undefined : '6 6',
        });
        routesLayer.addLayer(line);
        if (isActive) {
          dest.routeCoords.forEach((pt) => boundsPoints.push(pt));
        }
      }

      const iconHtml = `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: ${color};
          color: #ffffff;
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          transform: ${isActive ? 'scale(1.12)' : 'scale(0.95)'};
        ">${index + 1}</div>
      `;

      const destMarker = L.marker([dest.lat, dest.lng], {
        icon: L.divIcon({
          className: 'innfinder-dest-pin',
          html: iconHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        zIndexOffset: isActive ? 600 : 300,
      }).bindTooltip(dest.label, { direction: 'top', offset: [0, -14] });

      if (onSelectDestination) {
        destMarker.on('click', () => onSelectDestination(dest.id));
      }

      routesLayer.addLayer(destMarker);
      if (isActive || !activeDestinationId) {
        boundsPoints.push([dest.lat, dest.lng]);
      }
    });

    if (boundsPoints.length >= 2) {
      map.fitBounds(L.latLngBounds(boundsPoints), {
        padding: [36, 36],
        maxZoom: 15,
        animate: true,
      });
    }
  }, [destinations, activeDestinationId, selectedRoom, onSelectDestination]);

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

      {/* Badge bán kính quét tự động & điểm quét thêm trên bản đồ */}
      {(shouldShowRadiusBadge || pickedCoords) && (
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5 pointer-events-none">
          {shouldShowRadiusBadge && (
            <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-md flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Radar className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
              <span>
                Bán kính quét:{' '}
                <strong className="text-teal-700 font-extrabold">{radiusKm} km</strong>
              </span>
            </div>
          )}

          {pickedCoords && (
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-200/90 shadow-md flex items-center gap-2 text-xs font-semibold text-slate-800">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Điểm quét thêm:{' '}
                <strong className="text-blue-700 font-extrabold">{pickedRadiusKm} km</strong>
              </span>
              {onClearPickedCoords && (
                <button
                  type="button"
                  onClick={onClearPickedCoords}
                  title="Xóa điểm quét thêm"
                  aria-label="Xóa điểm quét thêm"
                  className="ml-0.5 p-0.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Nhóm nút định vị GPS & phóng to / thu nhỏ bản đồ ở góc trên phải */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        {onLocateUser && (
          <button
            type="button"
            onClick={() => {
              const map = mapInstanceRef.current;
              if (map && userLat !== undefined && userLng !== undefined) {
                map.flyTo([userLat, userLng], Math.max(map.getZoom(), 14), {
                  animate: true,
                  duration: 0.75,
                });
              }
              onLocateUser();
            }}
            disabled={isLocating}
            title="Định vị vị trí hiện tại của tôi"
            aria-label="Định vị vị trí hiện tại của tôi"
            className="w-10 h-10 rounded-xl bg-white shadow-lg border border-slate-200/90 flex items-center justify-center text-slate-700 hover:text-teal-600 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Locate className={`w-5 h-5 ${isLocating ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        )}

        <div className="w-10 rounded-xl bg-white shadow-lg border border-slate-200/90 overflow-hidden divide-y divide-slate-200/80 flex flex-col">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            title="Phóng to"
            aria-label="Phóng to"
            className="w-10 h-9 flex items-center justify-center text-slate-700 hover:text-teal-600 hover:bg-slate-50 transition-colors active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            title="Thu nhỏ"
            aria-label="Thu nhỏ"
            className="w-10 h-9 flex items-center justify-center text-slate-700 hover:text-teal-600 hover:bg-slate-50 transition-colors active:scale-95 cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

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
