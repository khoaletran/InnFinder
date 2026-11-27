import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@heroui/react';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Heart,
  Images,
  MapPin,
  Sparkles,
  Star,
  User,
  Users,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer, PageHeader } from '@/components/common/PageContainer';
import { roomService } from '@/services/room.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import type { RoomDetailResponse } from '@/types/room.types';
import { formatVND, formatVNDShort } from '@/utils/formatters';

const FALLBACK_ROOM_IMAGE =
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000&q=85&auto=format';

function getHighResImageUrl(url: string): string {
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('w', '1000');
      parsed.searchParams.set('q', '85');
      parsed.searchParams.set('auto', 'format');
      return parsed.toString();
    } catch {
      return url;
    }
  }
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    const marker = '/image/upload/';
    const idx = url.indexOf(marker);
    const after = url.slice(idx + marker.length);
    const firstSegment = after.split('/')[0] ?? '';
    if (!firstSegment.includes('w_') && !firstSegment.includes('q_')) {
      return `${url.slice(0, idx + marker.length)}f_auto,q_auto:best,w_800,c_limit/${after}`;
    }
  }
  return url;
}

interface PriceOption {
  key: string;
  label: string;
  min?: number;
  max?: number;
  count: number;
}

function formatMillions(amount: number): string {
  const millions = amount / 1_000_000;
  return `${Number.isInteger(millions) ? millions : millions.toFixed(1).replace('.', ',')} triệu`;
}

function buildPriceOptions(rawPrices: number[]): PriceOption[] {
  const sorted = [...rawPrices].filter((p) => Number.isFinite(p) && p > 0).sort((a, b) => a - b);
  const allOption: PriceOption = {
    key: 'ALL',
    label: `Khoảng giá: Tất cả (${sorted.length})`,
    count: sorted.length,
  };
  if (sorted.length === 0) return [allOption];

  const minVal = sorted[0];
  const maxVal = sorted[sorted.length - 1];
  if (minVal === maxVal) {
    return [
      allOption,
      {
        key: `${minVal}-${maxVal}`,
        label: `Giá ${formatMillions(minVal)} (${sorted.length})`,
        min: minVal,
        max: maxVal,
        count: sorted.length,
      },
    ];
  }

  const step = 500_000;
  const rawSplits = [0.25, 0.5, 0.75]
    .map(
      (q) =>
        Math.round(sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))] / step) *
        step,
    )
    .filter((b) => b > minVal && b < maxVal);
  const splits = Array.from(new Set(rawSplits)).sort((a, b) => a - b);

  if (splits.length === 0) {
    const mid = Math.round((minVal + maxVal) / 2 / step) * step;
    if (mid > minVal && mid < maxVal) {
      splits.push(mid);
    } else {
      return [
        allOption,
        {
          key: `${minVal}-${maxVal}`,
          label: `${formatMillions(minVal)} – ${formatMillions(maxVal)} (${sorted.length})`,
          min: minVal,
          max: maxVal,
          count: sorted.length,
        },
      ];
    }
  }

  const segments: Array<{ min?: number; max?: number; label: string }> = [
    { min: undefined, max: splits[0], label: `Dưới ${formatMillions(splits[0])}` },
  ];
  for (let i = 0; i < splits.length - 1; i++) {
    segments.push({
      min: splits[i],
      max: splits[i + 1],
      label: `${formatMillions(splits[i])} – ${formatMillions(splits[i + 1])}`,
    });
  }
  const lastSplit = splits[splits.length - 1];
  segments.push({ min: lastSplit, max: undefined, label: `Từ ${formatMillions(lastSplit)}` });

  const dynamicOptions: PriceOption[] = [];
  for (const seg of segments) {
    const count = sorted.filter(
      (v) => (seg.min === undefined || v >= seg.min) && (seg.max === undefined || v <= seg.max),
    ).length;
    if (count > 0) {
      dynamicOptions.push({
        key: `${seg.min ?? 'min'}-${seg.max ?? 'max'}`,
        label: `${seg.label} (${count})`,
        min: seg.min,
        max: seg.max,
        count,
      });
    }
  }

  return [allOption, ...dynamicOptions];
}

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { favoriteIds, localFavoriteRooms, loadFavorites, removeFavorite } = useFavoriteStore();

  const [searchInput, setSearchInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('Tất cả');
  const [selectedPriceKey, setSelectedPriceKey] = useState('ALL');
  const [sortOption, setSortOption] = useState<'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC'>('NEWEST');

  useEffect(() => {
    loadFavorites(isAuthenticated);
  }, [isAuthenticated, loadFavorites]);

  const {
    data: catalogPage,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rooms', 'favorites-sync', favoriteIds],
    queryFn: () => roomService.searchRooms({ page: 0, size: 50 }),
    enabled: favoriteIds.length > 0,
  });

  const rooms = useMemo(() => {
    const serverRooms = (catalogPage?.content || []).filter((r) =>
      favoriteIds.includes(r.maPhongTro),
    );
    const mergedMap = new Map(localFavoriteRooms.map((r) => [r.maPhongTro, r]));
    serverRooms.forEach((r) => mergedMap.set(r.maPhongTro, r));
    return Array.from(mergedMap.values()).filter((r) => favoriteIds.includes(r.maPhongTro));
  }, [catalogPage, favoriteIds, localFavoriteRooms]);

  // Tải thông tin chi tiết thật (mô tả, tiện ích, tiền cọc, chủ trọ, đánh giá) từ API cho từng phòng yêu thích
  const roomDetailsMap = useQueries({
    queries: rooms.map((r) => ({
      queryKey: ['rooms', 'detail', r.maPhongTro],
      queryFn: () => roomService.getRoomDetail(r.maPhongTro),
      staleTime: 5 * 60 * 1000,
      retry: false,
    })),
    combine: (results) => {
      const map = new Map<string, RoomDetailResponse>();
      results.forEach((res) => {
        if (res.data) {
          map.set(res.data.maPhongTro, res.data);
        }
      });
      return map;
    },
  });

  // Tìm kiếm ngôn ngữ tự nhiên mặc định bằng AI khi người dùng nhập yêu cầu
  const { data: aiMatchedIds = undefined, isFetching: isAiSearching } = useQuery({
    queryKey: ['rooms', 'favorites-ai-search', submittedQuery],
    queryFn: async (): Promise<string[] | null> => {
      try {
        const res = await roomService.aiSearchWithDetails(submittedQuery.trim(), {}, 30);
        return (res.rooms || []).map((r) => r.maPhongTro);
      } catch {
        return null;
      }
    },
    enabled: submittedQuery.trim().length > 0,
    staleTime: 60 * 1000,
    retry: false,
  });

  // Lấy danh sách khu vực / tỉnh thành động từ chính các phòng đã lưu
  const areaOptions = useMemo(() => {
    const counts = new Map<string, number>();
    rooms.forEach((r) => {
      if (!r.diaChi) return;
      const parts = r.diaChi
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      const city = parts[parts.length - 1];
      if (city) {
        counts.set(city, (counts.get(city) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [rooms]);

  const effectiveCityFilter =
    cityFilter === 'Tất cả' || areaOptions.some((a) => a.name === cityFilter)
      ? cityFilter
      : 'Tất cả';

  // Các mốc khoảng giá sinh động hoàn toàn từ giá thực tế của các phòng đã lưu
  const priceOptions = useMemo(
    () => buildPriceOptions(rooms.map((r) => r.giaThue)),
    [rooms],
  );
  const selectedPriceOption =
    priceOptions.find((opt) => opt.key === selectedPriceKey) ?? priceOptions[0];
  const effectivePriceKey = selectedPriceOption?.key ?? 'ALL';

  const filteredRooms = useMemo(() => {
    const trimmedQuery = submittedQuery.trim().toLowerCase();

    const list = rooms.filter((r) => {
      const detail = roomDetailsMap.get(r.maPhongTro);
      let matchSearch = true;

      if (trimmedQuery) {
        if (Array.isArray(aiMatchedIds)) {
          matchSearch = aiMatchedIds.includes(r.maPhongTro);
        } else if (aiMatchedIds === null) {
          const title = detail?.tieuDe || detail?.tenPhong || r.tieuDe || r.diaChi;
          const roomType = detail?.loaiPhong?.tenLoaiPhongTro || r.tenLoaiPhong || '';
          const desc = detail?.moTa || '';
          const amenityNames = [
            ...(r.dsTienIch || []),
            ...(detail?.dsTienIch?.map((a) => (typeof a === 'string' ? a : a.tenTienIch)) || []),
          ].join(' ');
          matchSearch =
            title.toLowerCase().includes(trimmedQuery) ||
            r.diaChi.toLowerCase().includes(trimmedQuery) ||
            roomType.toLowerCase().includes(trimmedQuery) ||
            desc.toLowerCase().includes(trimmedQuery) ||
            amenityNames.toLowerCase().includes(trimmedQuery);
        }
      }

      const matchCity =
        effectiveCityFilter === 'Tất cả' ||
        r.diaChi.toLowerCase().includes(effectiveCityFilter.toLowerCase());

      const matchPrice =
        (!selectedPriceOption || selectedPriceOption.key === 'ALL') ||
        ((selectedPriceOption.min === undefined || r.giaThue >= selectedPriceOption.min) &&
          (selectedPriceOption.max === undefined || r.giaThue <= selectedPriceOption.max));

      return matchSearch && matchCity && matchPrice;
    });

    if (sortOption === 'PRICE_ASC') {
      return [...list].sort((a, b) => a.giaThue - b.giaThue);
    }
    if (sortOption === 'PRICE_DESC') {
      return [...list].sort((a, b) => b.giaThue - a.giaThue);
    }
    if (trimmedQuery && Array.isArray(aiMatchedIds)) {
      const rank = new Map(aiMatchedIds.map((id, idx) => [id, idx]));
      return [...list].sort(
        (a, b) => (rank.get(a.maPhongTro) ?? Infinity) - (rank.get(b.maPhongTro) ?? Infinity),
      );
    }
    return list;
  }, [
    rooms,
    roomDetailsMap,
    submittedQuery,
    aiMatchedIds,
    effectiveCityFilter,
    selectedPriceOption,
    sortOption,
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSubmittedQuery('');
  };

  const handleRemoveFavorite = async (roomId: string) => {
    await removeFavorite(roomId, isAuthenticated);
    toast.success('Đã xóa phòng khỏi danh sách yêu thích');
  };

  const handleBookRoom = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    const targetPath = `/appointments/schedule/${roomId}`;
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để đặt lịch hẹn xem phòng');
      navigate('/login', { state: { from: { pathname: targetPath } } });
      return;
    }
    navigate(targetPath);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSubmittedQuery('');
    setCityFilter('Tất cả');
    setSelectedPriceKey('ALL');
    setSortOption('NEWEST');
  };

  return (
    <PageContainer width="wide" className="space-y-6">
      <PageHeader
        title="Phòng yêu thích"
        action={
          <AppButton variant="primary" size="md" onClick={() => navigate('/search')}>
            Tìm thêm phòng
          </AppButton>
        }
      />

      {rooms.length > 0 && (
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex-1 relative flex items-center bg-slate-50 focus-within:bg-white rounded-xl border border-slate-200 focus-within:border-teal-600 transition-colors">
              <Sparkles
                className={`w-4 h-4 text-teal-600 absolute left-3 pointer-events-none ${
                  isAiSearching ? 'animate-spin' : ''
                }`}
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  const next = e.target.value;
                  setSearchInput(next);
                  if (!next.trim() && submittedQuery) {
                    setSubmittedQuery('');
                  }
                }}
                placeholder="Mô tả phòng đã lưu cần tìm bằng ngôn ngữ tự nhiên (VD: có máy lạnh dưới 4tr)..."
                className="w-full h-10 pl-9 pr-8 text-sm text-slate-900 bg-transparent outline-none placeholder:text-slate-500"
              />
              {(searchInput || submittedQuery) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <AppButton type="submit" variant="primary" size="sm" isLoading={isAiSearching}>
              Tìm
            </AppButton>
          </form>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <select
              value={effectiveCityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 outline-none cursor-pointer"
            >
              <option value="Tất cả">Khu vực: Tất cả ({rooms.length})</option>
              {areaOptions.map((area) => (
                <option key={area.name} value={area.name}>
                  {area.name} ({area.count})
                </option>
              ))}
            </select>

            <select
              value={effectivePriceKey}
              onChange={(e) => setSelectedPriceKey(e.target.value)}
              className="h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 outline-none cursor-pointer"
            >
              {priceOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={sortOption}
              onChange={(e) =>
                setSortOption(e.target.value as 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC')
              }
              className="h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 outline-none cursor-pointer"
            >
              <option value="NEWEST">Mới lưu nhất</option>
              <option value="PRICE_ASC">Giá thấp đến cao</option>
              <option value="PRICE_DESC">Giá cao đến thấp</option>
            </select>
          </div>
        </div>
      )}

      {error ? (
        <div className="bg-white rounded-2xl border border-red-200 p-6 text-center space-y-3 shadow-xs">
          <AlertCircle className="w-7 h-7 text-red-600 mx-auto" />
          <p className="text-sm font-bold text-slate-900">Không thể đồng bộ danh sách yêu thích</p>
          <AppButton variant="primary" size="sm" onClick={() => void refetch()}>
            Thử lại
          </AppButton>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row md:h-[212px] animate-pulse"
            >
              <div className="w-full h-48 md:w-[270px] lg:w-[290px] md:h-full bg-slate-200 shrink-0" />
              <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-2">
                <div className="space-y-2.5">
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-6 bg-slate-100 rounded w-2/3" />
                  <div className="h-4 bg-slate-100 rounded w-4/5" />
                </div>
                <div className="h-4 bg-slate-100 rounded w-1/3" />
              </div>
              <div className="md:w-[235px] lg:w-[250px] md:h-full p-4 sm:p-5 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-end gap-3.5">
                <div className="space-y-1.5 md:flex md:flex-col md:items-end">
                  <div className="h-7 bg-slate-200 rounded w-28" />
                  <div className="h-4 bg-slate-100 rounded w-32" />
                </div>
                <div className="h-11 bg-slate-200 rounded-xl w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredRooms.length > 0 ? (
        <div className="space-y-4">
          {filteredRooms.map((room) => {
            const detail = roomDetailsMap.get(room.maPhongTro);
            const rawRoomImage =
              detail?.dsHinhAnh?.find((i) => i.laDaiDien)?.url ||
              detail?.dsHinhAnh?.[0]?.url ||
              room.anhDaiDien ||
              detail?.hinhAnh?.[0]?.duongDan ||
              room.hinhAnh?.[0]?.duongDan ||
              FALLBACK_ROOM_IMAGE;
            const roomImage = getHighResImageUrl(rawRoomImage);
            const photoCount =
              detail?.dsHinhAnh?.length || detail?.hinhAnh?.length || room.hinhAnh?.length || 0;
            const roomTypeLabel =
              detail?.loaiPhong?.tenLoaiPhongTro ||
              detail?.loaiPhong?.tenLoaiPhong ||
              room.tenLoaiPhong ||
              'Phòng trọ';
            const roomTitle =
              detail?.tieuDe ||
              detail?.tenPhong ||
              room.tieuDe ||
              `${roomTypeLabel} - ${room.diaChi.split(',')[0] || ''}`;
            const status = detail?.trangThai ?? room.trangThai ?? 'DA_DUYET';
            const reputation = detail?.chuTro?.diemUyTin ?? room.diemUyTinChuTro;
            const ratingAvg = detail?.diemDanhGiaTrungBinh;
            const ratingCount = detail?.tongSoDanhGia ?? 0;
            const detailAmenities =
              detail?.dsTienIch
                ?.map((a) => (typeof a === 'string' ? a : a.tenTienIch))
                .filter(Boolean) ?? [];
            const summaryAmenities = room.dsTienIch?.filter(Boolean) ?? [];
            const amenities = detailAmenities.length > 0 ? detailAmenities : summaryAmenities;
            const landlordName = detail?.chuTro?.hoVaTen || detail?.chuTro?.hoTen;
            const contractDeposit = detail?.cocPhong ?? detail?.coc ?? room.giaThue;

            return (
              <Card
                key={room.maPhongTro}
                onClick={() => navigate(`/room/${room.maPhongTro}`)}
                className="group flex flex-col md:flex-row md:h-[212px] overflow-hidden p-0 gap-0 rounded-2xl border border-slate-200/90 hover:border-teal-500/70 bg-white shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                {/* CỘT TRÁI: ẢNH PHÒNG ĐỒNG NHẤT KÍCH THƯỚC & SẮC NÉT */}
                <div className="w-full h-48 md:w-[270px] lg:w-[290px] md:h-full shrink-0 relative bg-slate-100 overflow-hidden">
                  <img
                    src={roomImage}
                    alt={roomTitle}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/75 backdrop-blur-xs text-white text-[11px] font-bold shadow-xs">
                    {roomTypeLabel}
                  </span>
                  {photoCount > 0 && (
                    <span className="inline-flex items-center gap-1 absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-900/75 backdrop-blur-xs text-white text-[11px] font-semibold shadow-xs">
                      <Images className="w-3.5 h-3.5 text-teal-300" />
                      <span>{photoCount} ảnh</span>
                    </span>
                  )}
                </div>

                {/* CỘT GIỮA: THÔNG TIN TÓM TẮT & TIỆN ÍCH CHÍNH */}
                <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0 gap-2 overflow-hidden">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-1">
                        {roomTitle}
                      </h3>
                      {status === 'DA_DUYET' && (
                        <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                          Còn trống
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-1.5 text-xs sm:text-sm text-slate-600 min-w-0">
                      <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{room.diaChi}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                        {room.dienTich} m²
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {room.soNguoi || 2} người
                      </span>
                      {reputation !== undefined && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-800 font-semibold">
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          Uy tín {reputation}
                        </span>
                      )}
                      {ratingCount > 0 && ratingAvg !== undefined && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50/70 border border-amber-200/60 text-slate-800 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>
                            {ratingAvg.toFixed(1)} ({ratingCount})
                          </span>
                        </span>
                      )}
                    </div>

                    {amenities.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 max-h-6 overflow-hidden">
                        {amenities.slice(0, 3).map((amenity, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{amenity}</span>
                          </span>
                        ))}
                        {amenities.length > 3 && (
                          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                            +{amenities.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                      {landlordName && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 truncate max-w-full">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">Chủ trọ: {landlordName}</span>
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/room/${room.maPhongTro}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-800 shrink-0"
                    >
                      <span>Xem chi tiết</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* CỘT PHẢI: GIÁ THUÊ, TIỀN CỌC & HÀNH ĐỘNG */}
                <div className="md:w-[235px] lg:w-[250px] md:h-full shrink-0 p-4 sm:p-5 bg-slate-50/70 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-end gap-3.5">
                  <div className="md:text-right space-y-1">
                    <div className="text-2xl font-black text-teal-700 tracking-tight">
                      {formatVNDShort(room.giaThue, '')}
                      <span className="text-xs font-semibold text-slate-500 ml-1">/tháng</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Cọc:{' '}
                      <span className="font-semibold text-slate-700">
                        {formatVND(contractDeposit)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Bỏ yêu thích"
                      aria-label="Bỏ yêu thích"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRemoveFavorite(room.maPhongTro);
                      }}
                      className="w-11 h-11 shrink-0 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleBookRoom(e, room.maPhongTro)}
                      className="flex-1 h-11 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-sm shadow-teal-600/20 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>Đặt lịch xem</span>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : rooms.length > 0 ? (
        <EmptyState
          title="Không có phòng khớp bộ lọc"
          description="Hãy xóa bộ lọc để xem lại tất cả các phòng bạn đã lưu."
          icon={<Heart className="w-6 h-6" />}
          action={
            <AppButton variant="primary" size="md" onClick={resetFilters}>
              Xóa bộ lọc
            </AppButton>
          }
        />
      ) : (
        <EmptyState
          title="Bạn chưa lưu phòng yêu thích nào"
          description="Nhấn biểu tượng trái tim trên bất kỳ tin phòng nào để lưu lại so sánh và đặt lịch xem nhanh."
          icon={<Heart className="w-6 h-6 text-red-500" />}
          action={
            <AppButton variant="primary" size="md" onClick={() => navigate('/search')}>
              Khám phá phòng ngay
            </AppButton>
          }
        />
      )}
    </PageContainer>
  );
};
