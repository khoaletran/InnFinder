import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Card } from '@heroui/react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpDown,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Droplets,
  FilePlus2,
  List,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { CurrencyInput } from '@/components/common/CurrencyInput';
import { ChatDrawer } from '@/components/chat/ChatDrawer';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { RoomMap } from '@/components/map/RoomMap';
import {
  GENDER_LABELS,
  ROOMMATE_CRITERIA_PRESETS,
  RoommateBookingLink,
  RoommateCards,
  roommateDate,
  roommatePrice,
} from '@/components/roommate/RoommateCards';
import { appointmentService } from '@/services/appointment.service';
import { roomService } from '@/services/room.service';
import { roommateService } from '@/services/roommate.service';
import type {
  MyRoommateApplication,
  ReceivedRoommateApplication,
  RoommateAppStatus,
  RoommateApplication,
  RoommateGender,
} from '@/services/roommate.service';

const isReceivedApplication = (
  app: MyRoommateApplication | ReceivedRoommateApplication,
): app is ReceivedRoommateApplication => 'tenNguoiDangKy' in app;
import { useAuthStore } from '@/store/useAuthStore';
import type { RoomSummaryResponse } from '@/types/room.types';
import {
  roommateApplySchema,
  roommateCommentSchema,
  roommateFormSchema,
} from '@/utils/validators';
import type { RoommateApplyInput, RoommateInput } from '@/utils/validators';

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15';

const APP_STATUS_UI: Record<RoommateAppStatus, { label: string; badgeClass: string }> = {
  CHO_DUYET: { label: 'Chờ chủ bài duyệt', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  DA_DUYET: { label: 'Đã được duyệt', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  TU_CHOI: { label: 'Đã bị từ chối', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200' },
  DA_HUY: { label: 'Đã hủy đơn', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const APPLICANT_GENDER_LABEL: Record<'NAM' | 'NU' | 'KHAC', string> = {
  NAM: 'Nam',
  NU: 'Nữ',
  KHAC: 'Khác',
};

type RoommatePopover = 'price' | 'gender' | 'slots' | 'sort' | null;
type RoommateSort = 'newest' | 'price_asc' | 'price_desc' | 'move_in';

const ROOMMATE_PRICE_OPTIONS: Array<{ label: string; maxPrice?: number }> = [
  { label: 'Tất cả mức giá', maxPrice: undefined },
  { label: 'Dưới 1.5 triệu', maxPrice: 1_500_000 },
  { label: 'Dưới 2.5 triệu', maxPrice: 2_500_000 },
  { label: 'Dưới 4 triệu', maxPrice: 4_000_000 },
  { label: 'Dưới 6 triệu', maxPrice: 6_000_000 },
];

const ROOMMATE_SORT_OPTIONS: Array<{ value: RoommateSort; label: string }> = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'move_in', label: 'Vào ở sớm nhất' },
];

// -----------------------------------------------------------------------------
// 1. TRANG DANH SÁCH Ở GHÉP (/roommates)
// -----------------------------------------------------------------------------
export function RoommateListPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'MINE' | 'APPLICATIONS'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [activePopover, setActivePopover] = useState<RoommatePopover>(null);
  const popoverBarRef = useRef<HTMLElement>(null);

  const [filters, setFilters] = useState<{ area?: string; maxPrice?: number; gender?: RoommateGender }>({});
  const [areaInput, setAreaInput] = useState('');
  const [minSlots, setMinSlots] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<RoommateSort>('newest');

  const userId = useAuthStore((state) => state.user?.maNguoiDung);
  const client = useQueryClient();

  const effectiveTab = userId ? activeTab : 'ALL';

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverBarRef.current && !popoverBarRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const completedBookingsQuery = useQuery({
    queryKey: ['appointments', 'my', 'completed-for-roommate', userId],
    queryFn: appointmentService.getMyAppointments,
    enabled: Boolean(userId) && createModalOpen,
    retry: false,
  });

  const listQuery = useInfiniteQuery({
    queryKey:
      effectiveTab === 'MINE'
        ? ['roommates', 'mine', userId]
        : ['roommates', 'list', filters],
    queryFn: ({ pageParam }) =>
      effectiveTab === 'MINE'
        ? roommateService.mine(pageParam)
        : roommateService.list({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: effectiveTab !== 'APPLICATIONS',
    retry: false,
  });

  const myAppsQuery = useQuery({
    queryKey: ['roommates', 'my-applications', userId],
    queryFn: roommateService.myApplications,
    enabled: Boolean(userId) && effectiveTab === 'APPLICATIONS',
    retry: false,
  });

  const cancelAppMutation = useMutation({
    mutationFn: ({ postId, appId }: { postId: string; appId: string }) =>
      roommateService.cancelApplication(postId, appId),
    onSuccess: async () => {
      toast.success('Đã hủy đơn đăng ký ở ghép');
      await client.invalidateQueries({ queryKey: ['roommates'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Không thể hủy đơn'),
  });

  const rawPosts = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [listQuery.data],
  );

  const posts = useMemo(() => {
    let items = [...rawPosts];
    if (effectiveTab === 'ALL' && minSlots !== undefined) {
      items = items.filter((p) => Math.max(0, p.soNguoiCanTim - (p.soSlotDaDuyet ?? 0)) >= minSlots);
    }
    if (effectiveTab === 'ALL') {
      if (sortBy === 'price_asc') {
        items.sort((a, b) => a.chiPhiMoiNguoi - b.chiPhiMoiNguoi);
      } else if (sortBy === 'price_desc') {
        items.sort((a, b) => b.chiPhiMoiNguoi - a.chiPhiMoiNguoi);
      } else if (sortBy === 'move_in') {
        items.sort((a, b) => a.ngayVaoO.localeCompare(b.ngayVaoO));
      }
    }
    return items;
  }, [rawPosts, effectiveTab, minSlots, sortBy]);

  const myApplications = myAppsQuery.data ?? [];
  const completedBookings = (completedBookingsQuery.data ?? []).filter(
    (apt) => apt.trangThai === 'HOAN_THANH',
  );

  const mapRooms = useMemo<RoomSummaryResponse[]>(() => {
    return posts
      .filter((p) => typeof p.viDo === 'number' && typeof p.kinhDo === 'number')
      .map((p) => ({
        maPhongTro: p.id,
        tieuDe: `Cần ${p.soNguoiCanTim} người · ${p.khuVuc}`,
        diaChi: `${p.khuVuc} · ${p.loaiPhong}`,
        giaThue: p.chiPhiMoiNguoi,
        dienTich: 0,
        soNguoi: p.soNguoiCanTim,
        soNguoiToiDa: p.soNguoiCanTim,
        trangThai: p.trangThai === 'DANG_TIM' ? 'DA_DUYET' : 'HOAN_THANH',
        hinhAnhUrl: p.anhPhong ?? undefined,
        viDo: String(p.viDo),
        kinhDo: String(p.kinhDo),
      }));
  }, [posts]);

  const selectedMapRoom = useMemo(
    () => mapRooms.find((r) => r.maPhongTro === selectedPostId) ?? null,
    [mapRooms, selectedPostId],
  );
  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );

  const handleApplyFilter = (event: FormEvent) => {
    event.preventDefault();
    setFilters((prev) => ({
      ...prev,
      area: areaInput.trim() || undefined,
    }));
    setActivePopover(null);
  };

  const handleResetFilter = () => {
    setAreaInput('');
    setMinSlots(undefined);
    setSortBy('newest');
    setFilters({});
    setActivePopover(null);
  };

  const selectedPriceLabel = filters.maxPrice
    ? `Dưới ${filters.maxPrice / 1_000_000}tr`
    : 'Giá';
  const selectedGenderLabel = filters.gender
    ? GENDER_LABELS[filters.gender]
    : 'Giới tính';
  const selectedSlotsLabel = minSlots ? `Từ ${minSlots} người` : 'Số người';
  const currentSortLabel =
    ROOMMATE_SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || 'Sắp xếp';
  const hasAnyFilter = Boolean(
    filters.area || filters.maxPrice !== undefined || filters.gender || minSlots !== undefined || sortBy !== 'newest',
  );

  return (
    <div className="flex-1 bg-slate-50 flex flex-col w-full">
      {/* HEADER BỘ LỌC & CHUYỂN CHẾ ĐỘ CỐ ĐỊNH 2 DÒNG */}
      <section
        ref={popoverBarRef}
        className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-[100px] z-30 shrink-0"
      >
        <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 divide-y divide-slate-100">
          {/* Dòng 1: Tabs ngữ cảnh + Tạo bài + Chế độ Danh sách / Bản đồ */}
          <div className="py-2.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {userId ? (
                <div className="bg-slate-100 p-1 rounded-xl inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ALL')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      effectiveTab === 'ALL'
                        ? 'bg-white text-teal-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Khám phá</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('MINE')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      effectiveTab === 'MINE'
                        ? 'bg-white text-teal-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>Bài của tôi</span>
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Users className="w-4 h-4 text-teal-700" />
                  <span>Khám phá bài tìm bạn ở ghép</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {userId && (
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo bài</span>
                </button>
              )}

              {effectiveTab === 'ALL' && (
                <div
                  role="navigation"
                  aria-label="Chế độ xem bài ở ghép"
                  className="bg-slate-100 p-1 rounded-xl inline-flex items-center gap-1 shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      viewMode === 'grid'
                        ? 'bg-white text-teal-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Danh sách</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('map')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      viewMode === 'map'
                        ? 'bg-white text-teal-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>Bản đồ</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dòng 2: Ô tìm kiếm khu vực + các bộ lọc popover */}
          {effectiveTab === 'ALL' && (
            <div className="py-2.5 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
              <form
                aria-label="Tìm bài ở ghép"
                onSubmit={handleApplyFilter}
                className="flex items-center w-full sm:w-[280px] lg:w-[320px] shrink-0"
              >
                <div className="flex-1 relative flex items-center">
                  <input
                    name="area"
                    maxLength={100}
                    value={areaInput}
                    onChange={(e) => setAreaInput(e.target.value)}
                    placeholder="Tìm khu vực, tên đường..."
                    className="w-full h-9 pl-3.5 pr-10 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-teal-600 outline-none transition-colors placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    aria-label="Tìm kiếm"
                    title="Tìm kiếm"
                    className="absolute right-1.5 w-7 h-7 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </form>

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* 1. Chip Giá */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActivePopover((p) => (p === 'price' ? null : 'price'))}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      filters.maxPrice !== undefined || activePopover === 'price'
                        ? 'bg-teal-50 text-teal-800 border-teal-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{selectedPriceLabel}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {activePopover === 'price' && (
                    <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-64 bg-white rounded-2xl border border-slate-200 shadow-lg p-2.5 z-50 space-y-1">
                      {ROOMMATE_PRICE_OPTIONS.map((option) => {
                        const selected = filters.maxPrice === option.maxPrice;
                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => {
                              setFilters((prev) => ({ ...prev, maxPrice: option.maxPrice }));
                              setActivePopover(null);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                              selected
                                ? 'bg-teal-50 text-teal-800 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="truncate">{option.label}</span>
                            {selected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Chip Giới tính */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActivePopover((p) => (p === 'gender' ? null : 'gender'))}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      filters.gender || activePopover === 'gender'
                        ? 'bg-teal-50 text-teal-800 border-teal-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{selectedGenderLabel}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {activePopover === 'gender' && (
                    <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-56 bg-white rounded-2xl border border-slate-200 shadow-lg p-2.5 z-50 space-y-1">
                      {(
                        [
                          { value: undefined, label: 'Tất cả giới tính' },
                          { value: 'NAM' as RoommateGender, label: 'Ưu tiên Nam' },
                          { value: 'NU' as RoommateGender, label: 'Ưu tiên Nữ' },
                        ] as const
                      ).map((opt) => {
                        const selected = filters.gender === opt.value;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => {
                              setFilters((prev) => ({ ...prev, gender: opt.value }));
                              setActivePopover(null);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                              selected
                                ? 'bg-teal-50 text-teal-800 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {selected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Chip Số người cần */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActivePopover((p) => (p === 'slots' ? null : 'slots'))}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      minSlots !== undefined || activePopover === 'slots'
                        ? 'bg-teal-50 text-teal-800 border-teal-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{selectedSlotsLabel}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {activePopover === 'slots' && (
                    <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-52 bg-white rounded-2xl border border-slate-200 shadow-lg p-2.5 z-50 space-y-1">
                      {[
                        { value: undefined, label: 'Tất cả số người' },
                        { value: 1, label: 'Từ 1 người' },
                        { value: 2, label: 'Từ 2 người' },
                        { value: 3, label: 'Từ 3 người' },
                      ].map((opt) => {
                        const selected = minSlots === opt.value;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => {
                              setMinSlots(opt.value);
                              setActivePopover(null);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                              selected
                                ? 'bg-teal-50 text-teal-800 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {selected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Chip Sắp xếp */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActivePopover((p) => (p === 'sort' ? null : 'sort'))}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      sortBy !== 'newest' || activePopover === 'sort'
                        ? 'bg-teal-50 text-teal-800 border-teal-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>{currentSortLabel}</span>
                  </button>

                  {activePopover === 'sort' && (
                    <div className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-56 bg-white rounded-2xl border border-slate-200 shadow-lg p-2.5 z-50 space-y-1">
                      {ROOMMATE_SORT_OPTIONS.map((opt) => {
                        const selected = sortBy === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSortBy(opt.value);
                              setActivePopover(null);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                              selected
                                ? 'bg-teal-50 text-teal-800 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {selected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {hasAnyFilter && (
                  <button
                    type="button"
                    onClick={handleResetFilter}
                    className="inline-flex items-center gap-1 h-8 sm:h-9 px-2.5 rounded-full text-[11px] sm:text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Xóa lọc</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* KHU VỰC KẾT QUẢ */}
      <div className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 pt-5 pb-10 space-y-5 flex-1">
        {effectiveTab === 'ALL' && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <p>
              Tìm thấy <strong className="text-slate-900">{posts.length}</strong> bài tìm bạn ở ghép
              {viewMode === 'map' && ` · ${mapRooms.length} vị trí trên bản đồ`}
            </p>
          </div>
        )}

        {/* Nội dung Tab Khám phá & Bài của tôi */}
        {effectiveTab !== 'APPLICATIONS' && (
          <>
          {listQuery.isPending && <LoadingSpinner label="Đang tải danh sách bài ở ghép..." />}

            {listQuery.error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                {listQuery.error.message}
              </div>
            )}

            {listQuery.isSuccess && posts.length === 0 && (
              <EmptyState
                title={effectiveTab === 'MINE' ? 'Bạn chưa đăng bài ở ghép nào' : 'Chưa có bài ở ghép phù hợp'}
                description={
                  effectiveTab === 'MINE'
                    ? 'Chỉ những lịch hẹn đã hoàn thành thuê phòng mới có thể tạo bài tìm người ở ghép.'
                    : 'Hãy thử điều chỉnh khu vực hoặc mức giá lọc khác.'
                }
                action={
                  effectiveTab === 'MINE' ? (
                    <Link
                      to="/appointments"
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-800"
                    >
                      Xem lịch hẹn để đăng bài
                    </Link>
                  ) : undefined
                }
              />
            )}

            {posts.length > 0 && (effectiveTab === 'MINE' || viewMode === 'grid') && (
              <RoommateCards posts={posts} />
            )}

            {posts.length > 0 && effectiveTab === 'ALL' && viewMode === 'map' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-5 space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {posts.map((post) => {
                    const remaining = Math.max(0, post.soNguoiCanTim - (post.soSlotDaDuyet ?? 0));
                    const isSelected = selectedPostId === post.id;
                    return (
                      <div
                        key={post.id}
                        onMouseEnter={() => setHoveredPostId(post.id)}
                        onMouseLeave={() => setHoveredPostId(null)}
                        onClick={() => setSelectedPostId(post.id)}
                        className={`rounded-2xl border p-3.5 bg-white transition-all cursor-pointer ${
                          isSelected
                            ? 'border-teal-700 ring-2 ring-teal-700/15 shadow-sm'
                            : 'border-slate-200/80 hover:border-teal-600/40'
                        }`}
                      >
                        <div className="flex gap-3.5">
                          <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                            {post.anhPhong ? (
                              <img src={post.anhPhong} alt={post.khuVuc} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-teal-700">
                                <Users className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-teal-700">
                                Còn {remaining}/{post.soNguoiCanTim} chỗ
                              </span>
                              <Link
                                to={`/roommates/${post.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] font-bold text-slate-600 hover:text-teal-700 hover:underline"
                              >
                                Chi tiết →
                              </Link>
                            </div>
                            <p className="truncate text-sm font-bold text-slate-900">
                              {post.khuVuc} · {post.loaiPhong}
                            </p>
                            <p className="text-sm font-extrabold text-teal-700">
                              {roommatePrice(post.chiPhiMoiNguoi)}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Vào ở từ {roommateDate(post.ngayVaoO)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="lg:col-span-7 relative h-[520px] lg:h-[600px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs bg-white">
                  <RoomMap
                    rooms={mapRooms}
                    selectedRoom={selectedMapRoom}
                    hoveredRoomId={hoveredPostId}
                    onSelectRoom={(room) => setSelectedPostId(room.maPhongTro)}
                    onHoverRoom={setHoveredPostId}
                    interactivePreview={false}
                  />
                  {selectedPost && (
                    <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 z-[400] rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            Cần thêm {selectedPost.soNguoiCanTim} người · {selectedPost.khuVuc}
                          </p>
                          <p className="text-xs font-extrabold text-teal-700 mt-0.5">
                            {roommatePrice(selectedPost.chiPhiMoiNguoi)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPostId(null)}
                          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <Link
                        to={`/roommates/${selectedPost.id}`}
                        className="mt-2.5 block w-full rounded-xl bg-teal-700 py-2 text-center text-xs font-bold text-white hover:bg-teal-800"
                      >
                        Xem chi tiết & Đăng ký
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {listQuery.hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  isDisabled={listQuery.isFetchingNextPage}
                  onPress={() => void listQuery.fetchNextPage()}
                >
                  {listQuery.isFetchingNextPage ? 'Đang tải...' : 'Xem thêm bài'}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Nội dung Tab Đơn của tôi */}
        {effectiveTab === 'APPLICATIONS' && (
          <div className="space-y-4">
            {myAppsQuery.isPending && <LoadingSpinner label="Đang tải đơn đăng ký của bạn..." />}

            {myAppsQuery.error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                {myAppsQuery.error.message}
              </div>
            )}

            {myAppsQuery.isSuccess && myApplications.length === 0 && (
              <EmptyState
                title="Bạn chưa gửi đơn đăng ký ở ghép nào"
                description="Khám phá các bài tìm bạn ở ghép phù hợp và gửi đơn đăng ký để chủ bài duyệt."
                action={
                  <button
                    type="button"
                    onClick={() => setActiveTab('ALL')}
                    className="rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-800 cursor-pointer"
                  >
                    Khám phá bài ở ghép
                  </button>
                }
              />
            )}

            {myApplications.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {myApplications.map((app) => {
                  const statusUi = APP_STATUS_UI[app.trangThai] || APP_STATUS_UI.CHO_DUYET;
                  return (
                    <Card
                      key={app.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
                    >
                      <div className="flex gap-4">
                        <div className="h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          {app.anhPhong ? (
                            <img src={app.anhPhong} alt={app.khuVuc} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-teal-700">
                              <Users className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to={`/roommates/${app.postId}`}
                              className="truncate text-sm font-bold text-slate-900 hover:text-teal-700"
                            >
                              {app.khuVuc} · {app.loaiPhong}
                            </Link>
                            <span
                              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusUi.badgeClass}`}
                            >
                              {statusUi.label}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-teal-700">
                            {roommatePrice(app.chiPhiMoiNguoi)}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Gửi lúc {new Date(app.guiLuc).toLocaleString('vi-VN')}
                          </p>
                          {app.trangThai === 'TU_CHOI' && app.lyDoTuChoi && (
                            <p className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs text-rose-700">
                              Lý do: {app.lyDoTuChoi}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Link
                              to={`/roommates/${app.postId}`}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Xem bài viết
                            </Link>
                            {app.trangThai === 'CHO_DUYET' && (
                              <button
                                type="button"
                                disabled={cancelAppMutation.isPending}
                                onClick={() =>
                                  cancelAppMutation.mutate({ postId: app.postId, appId: app.id })
                                }
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                              >
                                Hủy đơn
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL TẠO BÀI Ở GHÉP NHANH */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Tạo bài tìm bạn ở ghép</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chọn một phiếu thuê phòng đã hoàn thành để đăng bài.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {completedBookingsQuery.isPending ? (
                <LoadingSpinner label="Đang tải phiếu thuê của bạn..." />
              ) : completedBookings.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bạn chưa có lịch xem phòng nào ở trạng thái <strong>Hoàn thành</strong>. Hãy đặt lịch và hoàn tất thuê phòng trên InnFinder để tạo bài ở ghép.
                  </p>
                  <Link
                    to="/search"
                    onClick={() => setCreateModalOpen(false)}
                    className="inline-block rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800"
                  >
                    Tìm phòng ngay
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {completedBookings.map((apt) => (
                    <div
                      key={apt.maDatLich}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {apt.tieuDePhong || `Phòng #${apt.maPhongTro}`}
                        </p>
                        <p className="truncate text-xs text-slate-500 mt-0.5">{apt.diaChiPhong}</p>
                      </div>
                      <div className="shrink-0">
                        <RoommateBookingLink id={apt.maDatLich} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 1B. TRANG RIÊNG: ĐƠN ĐĂNG KÝ Ở GHÉP CỦA TÔI (/roommates/my-applications)
// -----------------------------------------------------------------------------
export function RoommateMyApplicationsPage() {
  const userId = useAuthStore((state) => state.user?.maNguoiDung);
  const client = useQueryClient();
  const [boxMode, setBoxMode] = useState<'AUTO' | 'SENT' | 'RECEIVED'>('AUTO');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RoommateAppStatus>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [chatTarget, setChatTarget] = useState<{ contextId: string; title: string } | null>(null);

  const myAppsQuery = useQuery({
    queryKey: ['roommates', 'my-applications', userId],
    queryFn: roommateService.myApplications,
    enabled: Boolean(userId),
    retry: false,
  });

  const receivedAppsQuery = useQuery({
    queryKey: ['roommates', 'received-applications', userId],
    queryFn: roommateService.receivedApplications,
    enabled: Boolean(userId),
    retry: false,
  });

  const cancelAppMutation = useMutation({
    mutationFn: ({ postId, appId }: { postId: string; appId: string }) =>
      roommateService.cancelApplication(postId, appId),
    onSuccess: async () => {
      toast.success('Đã hủy đơn đăng ký ở ghép');
      await client.invalidateQueries({ queryKey: ['roommates'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Không thể hủy đơn'),
  });

  const approveAppMutation = useMutation({
    mutationFn: ({ postId, appId }: { postId: string; appId: string }) =>
      roommateService.approveApplication(postId, appId),
    onSuccess: async () => {
      toast.success('Đã duyệt người ở ghép!');
      await client.invalidateQueries({ queryKey: ['roommates'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Không thể duyệt đơn'),
  });

  const sentApps = useMemo(() => myAppsQuery.data ?? [], [myAppsQuery.data]);
  const receivedApps = useMemo(() => receivedAppsQuery.data ?? [], [receivedAppsQuery.data]);

  const effectiveMode: 'SENT' | 'RECEIVED' =
    boxMode === 'AUTO'
      ? sentApps.length === 0 && receivedApps.length > 0
        ? 'RECEIVED'
        : 'SENT'
      : boxMode;

  const activeList = effectiveMode === 'RECEIVED' ? receivedApps : sentApps;

  const statusCounts = useMemo(() => {
    const counts: Record<'ALL' | RoommateAppStatus, number> = {
      ALL: activeList.length,
      CHO_DUYET: 0,
      DA_DUYET: 0,
      TU_CHOI: 0,
      DA_HUY: 0,
    };
    for (const app of activeList) {
      if (counts[app.trangThai] !== undefined) counts[app.trangThai] += 1;
    }
    return counts;
  }, [activeList]);

  const filteredApps = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    const list = activeList.filter((app) => {
      if (statusFilter !== 'ALL' && app.trangThai !== statusFilter) return false;
      if (!q) return true;
      const applicantName = isReceivedApplication(app) ? app.tenNguoiDangKy : '';
      const applicantPhone = isReceivedApplication(app) ? app.sdtLienHe : '';
      return (
        app.khuVuc.toLowerCase().includes(q) ||
        app.loaiPhong.toLowerCase().includes(q) ||
        applicantName.toLowerCase().includes(q) ||
        applicantPhone.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      const tA = new Date(a.guiLuc || 0).getTime();
      const tB = new Date(b.guiLuc || 0).getTime();
      return sortOrder === 'desc' ? tB - tA : tA - tB;
    });
  }, [activeList, statusFilter, searchKeyword, sortOrder]);

  const activeQuery = effectiveMode === 'RECEIVED' ? receivedAppsQuery : myAppsQuery;

  return (
    <div className="flex-1 bg-slate-50">
      <main className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 space-y-4">
        <Card className="bg-surface rounded-xl border border-border overflow-x-clip p-0">
          <Card.Header className="p-0 border-b border-border sticky top-[100px] z-30 bg-white/95 backdrop-blur-md rounded-t-xl">
            {/* Hàng 1: Chuyển Đơn đã gửi / Đơn nhận được + Tìm kiếm + Sort + Làm mới + Thêm */}
            <div className="p-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                <div className="bg-slate-100 p-1 rounded-lg inline-flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setBoxMode('SENT')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      effectiveMode === 'SENT'
                        ? 'bg-white text-teal-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Đơn đã gửi ({sentApps.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoxMode('RECEIVED')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      effectiveMode === 'RECEIVED'
                        ? 'bg-white text-teal-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Đơn nhận được ({receivedApps.length})
                  </button>
                </div>

                <div className="relative flex-1 min-w-[180px] max-w-sm">
                  <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={
                      effectiveMode === 'RECEIVED'
                        ? 'Tìm người gửi, SĐT, khu vực...'
                        : 'Tìm theo khu vực, loại phòng...'
                    }
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-subtle border border-border text-xs text-text placeholder:text-text-subtle focus:outline-none focus:bg-surface focus:border-accent"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="px-3 py-2 rounded-lg border border-border bg-surface text-xs font-semibold text-slate-700 hover:bg-surface-subtle inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  <span>{sortOrder === 'desc' ? 'Mới nhất trước ↓' : 'Cũ nhất trước ↑'}</span>
                </button>

                {(searchKeyword || statusFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchKeyword('');
                      setStatusFilter('ALL');
                    }}
                    className="px-3 py-2 rounded-lg border border-border bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer whitespace-nowrap"
                  >
                    Đặt lại
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    void myAppsQuery.refetch();
                    void receivedAppsQuery.refetch();
                  }}
                  disabled={myAppsQuery.isFetching || receivedAppsQuery.isFetching}
                  className="px-3 py-2 rounded-lg bg-white border border-border hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-slate-500 ${
                      myAppsQuery.isFetching || receivedAppsQuery.isFetching ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Làm mới</span>
                </button>
                <Link
                  to="/roommates"
                  className="px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tìm thêm bài ở ghép</span>
                </Link>
              </div>
            </div>

            {/* Hàng 2: Tabs trạng thái gạch chân chia đều chuẩn Admin */}
            <div className="flex items-center border-t border-slate-100 overflow-x-auto bg-white">
              {([
                { id: 'ALL', label: 'Tất cả', icon: Users },
                { id: 'CHO_DUYET', label: 'Chờ duyệt', icon: Clock },
                { id: 'DA_DUYET', label: 'Đã duyệt', icon: CheckCircle2 },
                { id: 'TU_CHOI', label: 'Từ chối', icon: XCircle },
                { id: 'DA_HUY', label: 'Đã hủy', icon: AlertCircle },
              ] as const).map((tab) => {
                const Icon = tab.icon;
                const isActive = statusFilter === tab.id;
                const count = statusCounts[tab.id] ?? 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'border-teal-700 text-teal-800'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold leading-none ${
                        isActive ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card.Header>

          <Card.Content className="p-0 overflow-x-auto">
            {activeQuery.isPending ? (
              <div className="p-6">
                <LoadingSpinner label="Đang tải đơn đăng ký..." />
              </div>
            ) : activeQuery.error ? (
              <div className="p-4 m-4 rounded-xl border border-rose-200 bg-rose-50 text-xs font-medium text-rose-700">
                {activeQuery.error.message}
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title={
                    effectiveMode === 'RECEIVED'
                      ? 'Chưa có ai gửi đơn vào bài ở ghép của bạn'
                      : 'Chưa có đơn đăng ký ở ghép nào'
                  }
                  description={
                    effectiveMode === 'RECEIVED'
                      ? 'Khi có người quan tâm gửi đơn đăng ký vào bài bạn đăng, toàn bộ đơn sẽ hiển thị tại đây.'
                      : 'Khám phá các bài tìm bạn ở ghép phù hợp và gửi đơn đăng ký để chủ bài duyệt.'
                  }
                  action={
                    <Link
                      to="/roommates"
                      className="rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-800"
                    >
                      Khám phá bài ở ghép
                    </Link>
                  }
                />
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">Bài ở ghép</th>
                    {effectiveMode === 'RECEIVED' && <th className="py-3 px-3.5">Người đăng ký</th>}
                    <th className="py-3 px-3.5 whitespace-nowrap">Chi phí / người</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Ngày gửi</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Trạng thái</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredApps.map((app) => {
                    const statusUi = APP_STATUS_UI[app.trangThai] || APP_STATUS_UI.CHO_DUYET;
                    const isReceived = isReceivedApplication(app);
                    return (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5 max-w-[280px]">
                            <div className="h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                              {app.anhPhong ? (
                                <img src={app.anhPhong} alt={app.khuVuc} className="h-full w-full object-cover" />
                              ) : (
                                <div className="grid h-full w-full place-items-center text-teal-700">
                                  <Users className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/roommates/${app.postId}`}
                                title={`${app.khuVuc} · ${app.loaiPhong}`}
                                className="font-semibold text-slate-900 hover:text-teal-700 truncate block"
                              >
                                {app.khuVuc}
                              </Link>
                              <p className="text-[11px] text-slate-500 truncate">{app.loaiPhong}</p>
                              {app.trangThai === 'TU_CHOI' && app.lyDoTuChoi && (
                                <p className="text-[11px] text-rose-600 mt-0.5 truncate">
                                  Lý do: {app.lyDoTuChoi}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {isReceived && (
                          <td className="py-3 px-3.5 max-w-[200px]">
                            <p className="font-semibold text-slate-900 truncate">{app.tenNguoiDangKy}</p>
                            <p
                              className="text-[11px] text-slate-500 truncate"
                              title={`${app.sdtLienHe} · ${app.ngheNghiep}`}
                            >
                              {app.sdtLienHe} · {app.ngheNghiep}
                            </p>
                          </td>
                        )}
                        <td className="py-3 px-3.5 font-bold text-teal-700 whitespace-nowrap">
                          {roommatePrice(app.chiPhiMoiNguoi).replace('/tháng', '')}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                          {new Date(app.guiLuc).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusUi.badgeClass}`}
                          >
                            {statusUi.label}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {isReceived && (
                              <button
                                type="button"
                                onClick={() =>
                                  setChatTarget({
                                    contextId: `${app.postId}__${app.maNguoiDangKy}`,
                                    title: `Ở ghép · ${app.tenNguoiDangKy}`,
                                  })
                                }
                                className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 cursor-pointer"
                              >
                                Nhắn tin
                              </button>
                            )}
                            {isReceived && app.trangThai === 'CHO_DUYET' && (
                              <button
                                type="button"
                                disabled={approveAppMutation.isPending}
                                onClick={() =>
                                  approveAppMutation.mutate({ postId: app.postId, appId: app.id })
                                }
                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                              >
                                Duyệt
                              </button>
                            )}
                            <Link
                              to={`/roommates/${app.postId}`}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Chi tiết
                            </Link>
                            {!isReceived && app.trangThai === 'CHO_DUYET' && (
                              <button
                                type="button"
                                disabled={cancelAppMutation.isPending}
                                onClick={() =>
                                  cancelAppMutation.mutate({ postId: app.postId, appId: app.id })
                                }
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                              >
                                Hủy đơn
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card.Content>
        </Card>
      </main>

      <ChatDrawer
        open={Boolean(chatTarget)}
        channelType="ROOMMATE"
        contextId={chatTarget?.contextId || ''}
        onClose={() => setChatTarget(null)}
        fallbackTitle={chatTarget?.title}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// 2. FORM THÊM / SỬA BÀI Ở GHÉP (Dùng chung cho Tạo mới & Chỉnh sửa)
// -----------------------------------------------------------------------------
function RoommateForm({
  initial,
  defaultArea,
  defaultUtilities,
  pending,
  error,
  onSave,
}: {
  initial?: RoommateInput;
  defaultArea?: string;
  defaultUtilities?: {
    giaDien?: number | null;
    giaNuoc?: number | null;
    giaNuocTheoNguoi?: boolean | null;
  };
  pending: boolean;
  error: Error | null;
  onSave: (input: RoommateInput) => void;
}) {
  const errorId = useId();
  const [selectedGender, setSelectedGender] = useState<RoommateGender>(
    initial?.gioiTinhUuTien ?? 'KHONG_YEU_CAU',
  );
  const [waterPerPerson, setWaterPerPerson] = useState<boolean>(
    Boolean(initial?.giaNuocTheoNguoi ?? defaultUtilities?.giaNuocTheoNguoi ?? false),
  );
  const [costInput, setCostInput] = useState<string>(() =>
    initial?.chiPhiMoiNguoi !== undefined ? String(initial.chiPhiMoiNguoi) : '',
  );
  const [elecInput, setElecInput] = useState<string>(() => {
    const val = initial?.giaDien ?? defaultUtilities?.giaDien;
    return val !== undefined && val !== null ? String(val) : '';
  });
  const [waterInput, setWaterInput] = useState<string>(() => {
    const val = initial?.giaNuoc ?? defaultUtilities?.giaNuoc;
    return val !== undefined && val !== null ? String(val) : '';
  });
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>(initial?.tieuChi ?? []);
  const [customCriterion, setCustomCriterion] = useState('');
  const [validation, setValidation] = useState<{ field: unknown; message: string }>();

  const toggleCriterion = (tag: string) => {
    setSelectedCriteria((prev) =>
      prev.includes(tag)
        ? prev.filter((item) => item !== tag)
        : prev.length >= 8
          ? prev
          : [...prev, tag],
    );
  };

  const handleAddCustomCriterion = () => {
    const trimmed = customCriterion.trim().slice(0, 40);
    if (!trimmed) return;
    if (selectedCriteria.length >= 8) {
      toast.error('Chỉ được chọn tối đa 8 tiêu chí');
      return;
    }
    if (!selectedCriteria.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedCriteria((prev) => [...prev, trimmed]);
    }
    setCustomCriterion('');
  };

  const customAddedCriteria = selectedCriteria.filter(
    (tag) => !(ROOMMATE_CRITERIA_PRESETS as readonly string[]).includes(tag),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const resolvedArea = (initial?.khuVuc || defaultArea || 'Phòng trọ InnFinder').trim().slice(0, 100);
    const rawElec = elecInput.trim();
    const rawWater = waterInput.trim();
    const result = roommateFormSchema.safeParse({
      khuVuc: resolvedArea,
      soNguoiCanTim: Number(values.get('soNguoiCanTim')),
      chiPhiMoiNguoi: Number(costInput || 0),
      ngayVaoO: values.get('ngayVaoO'),
      moTa: values.get('moTa'),
      gioiTinhUuTien: selectedGender,
      tieuChi: selectedCriteria,
      giaDien: rawElec !== '' ? Number(rawElec) : undefined,
      giaNuoc: rawWater !== '' ? Number(rawWater) : undefined,
      giaNuocTheoNguoi: waterPerPerson,
    });
    if (!result.success) {
      const issue = result.error.issues[0];
      setValidation({ field: issue.path[0], message: issue.message });
      return;
    }
    setValidation(undefined);
    onSave(result.data);
  }

  return (
    <form aria-label={initial ? 'Sửa bài ở ghép' : 'Đăng bài ở ghép'} className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-700">
          Số người cần tìm <span className="text-rose-500">*</span>
          <input
            name="soNguoiCanTim"
            type="number"
            required
            min={1}
            max={20}
            defaultValue={initial?.soNguoiCanTim ?? 1}
            className={inputClass}
          />
        </label>

        <label className="block text-xs font-semibold text-slate-700">
          Chi phí dự kiến (₫/người/tháng) <span className="text-rose-500">*</span>
          <div className="relative">
            <CurrencyInput
              name="chiPhiMoiNguoi"
              required
              value={costInput}
              onValueChange={setCostInput}
              placeholder="Ví dụ: 1.800.000"
              className={`${inputClass} pr-8 font-bold tabular-nums`}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 mt-0.75 text-xs font-semibold text-slate-400">
              ₫
            </span>
          </div>
        </label>

        <label className="block text-xs font-semibold text-slate-700">
          Ngày có thể vào ở <span className="text-rose-500">*</span>
          <input
            name="ngayVaoO"
            type="date"
            required
            defaultValue={initial?.ngayVaoO}
            className={inputClass}
          />
        </label>

        <div className="block text-xs font-semibold text-slate-700">
          <span>Giới tính ưu tiên</span>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {(['KHONG_YEU_CAU', 'NAM', 'NU'] as RoommateGender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGender(g)}
                className={`rounded-xl border px-2.5 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                  selectedGender === g
                    ? 'border-teal-700 bg-teal-50 text-teal-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {g === 'KHONG_YEU_CAU' ? 'Tất cả' : g === 'NAM' ? 'Nam' : 'Nữ'}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-xs font-semibold text-slate-700">
          Giá điện (₫/kWh)
          <div className="relative">
            <CurrencyInput
              name="giaDien"
              value={elecInput}
              onValueChange={setElecInput}
              placeholder="Ví dụ: 3.500"
              className={`${inputClass} pr-14 font-bold tabular-nums`}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 mt-0.75 text-xs font-semibold text-slate-400">
              ₫/kWh
            </span>
          </div>
        </label>

        <div className="block text-xs font-semibold text-slate-700">
          <div className="flex items-center justify-between gap-2">
            <span>Giá nước ({waterPerPerson ? '₫/người/tháng' : '₫/m³'})</span>
            <button
              type="button"
              onClick={() => setWaterPerPerson((v) => !v)}
              className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
            >
              Đổi sang {waterPerPerson ? 'theo khối (m³)' : 'theo người'}
            </button>
          </div>
          <div className="relative">
            <CurrencyInput
              name="giaNuoc"
              value={waterInput}
              onValueChange={setWaterInput}
              placeholder={waterPerPerson ? 'Ví dụ: 100.000' : 'Ví dụ: 20.000'}
              className={`${inputClass} pr-16 font-bold tabular-nums`}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 mt-0.75 text-xs font-semibold text-slate-400">
              {waterPerPerson ? '₫/người' : '₫/m³'}
            </span>
          </div>
        </div>
      </div>

      {/* Thói quen / Tiêu chí mong muốn */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            Tiêu chí & thói quen sinh hoạt (chọn tối đa 8)
          </span>
          <span className="text-[11px] text-slate-400">{selectedCriteria.length}/8</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {ROOMMATE_CRITERIA_PRESETS.map((tag) => {
            const active = selectedCriteria.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleCriterion(tag)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'border-teal-700 bg-teal-700 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {active && <Check className="h-3 w-3" />}
                {tag}
              </button>
            );
          })}
          {customAddedCriteria.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleCriterion(tag)}
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-700 bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
              title="Bấm để bỏ tiêu chí này"
            >
              <Check className="h-3 w-3" />
              <span>{tag}</span>
              <X className="h-3 w-3 opacity-80" />
            </button>
          ))}
        </div>

        {/* Ô tự điền thêm tiêu chí */}
        <div className="mt-2.5 flex items-center gap-2">
          <input
            type="text"
            maxLength={40}
            value={customCriterion}
            onChange={(e) => setCustomCriterion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomCriterion();
              }
            }}
            disabled={selectedCriteria.length >= 8}
            placeholder="Tự điền tiêu chí khác (VD: Ngủ sớm trước 23h, Không nấu ăn mùi nặng...)"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15 disabled:bg-slate-50 disabled:text-slate-400"
          />
          <button
            type="button"
            onClick={handleAddCustomCriterion}
            disabled={!customCriterion.trim() || selectedCriteria.length >= 8}
            className="inline-flex items-center gap-1 rounded-xl border border-teal-700 bg-teal-50 px-3.5 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Thêm</span>
          </button>
        </div>
      </div>

      <label className="block text-xs font-semibold text-slate-700">
        Mô tả chi tiết & yêu cầu bạn ở ghép <span className="text-rose-500">*</span>
        <textarea
          name="moTa"
          rows={4}
          required
          maxLength={1500}
          defaultValue={initial?.moTa}
          placeholder="Chia sẻ thêm về giờ giấc sinh hoạt, chia tiền điện nước, tính cách bạn ở ghép mong muốn..."
          className={inputClass}
        />
      </label>

      {(validation || error) && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-rose-600">
          {validation?.message || error?.message}
        </p>
      )}

      <Button
        type="submit"
        isDisabled={pending}
        className="rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
      >
        {pending ? 'Đang lưu...' : initial ? 'Lưu thay đổi' : 'Đăng bài tìm bạn ở ghép'}
      </Button>
    </form>
  );
}

// -----------------------------------------------------------------------------
// 3. TRANG THÊM BÀI Ở GHÉP (/appointments/:appointmentId/roommates)
// -----------------------------------------------------------------------------
export function RoommateCreatePage() {
  const { appointmentId = '' } = useParams();
  const userId = useAuthStore((state) => state.user?.maNguoiDung);
  const client = useQueryClient();
  const navigate = useNavigate();

  const booking = useQuery({
    queryKey: ['roommates', 'booking', userId, appointmentId],
    queryFn: () => roommateService.booking(appointmentId),
    retry: false,
  });

  const myAppointments = useQuery({
    queryKey: ['appointments', 'my', userId],
    queryFn: appointmentService.getMyAppointments,
    enabled: Boolean(userId),
    retry: false,
  });

  const matchedAppointment = myAppointments.data?.find((a) => a.maDatLich === appointmentId);
  const resolvedRoomArea = matchedAppointment?.diaChiPhong || booking.data?.loaiPhong;

  const mutation = useMutation({
    mutationFn: (input: RoommateInput) => roommateService.create(appointmentId, input),
    onSuccess: (id) => {
      toast.success('Đã đăng bài tìm bạn ở ghép thành công!');
      void client.invalidateQueries({ queryKey: ['roommates'] });
      void navigate('/roommates/' + id, { replace: true });
    },
  });

  if (booking.data?.baiDangId) {
    return <Navigate to={'/roommates/' + booking.data.baiDangId} replace />;
  }

  return (
    <div className="flex-1 bg-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Đăng bài tìm bạn ở ghép
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Tạo bài tìm người ở cùng từ phòng trọ bạn đã hoàn tất thuê.
          </p>
        </div>

        {booking.isPending && <LoadingSpinner label="Đang xác minh phiếu thuê..." />}

        {booking.error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
            {booking.error.message}
          </div>
        )}

        {booking.data && (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Cột trái: Thông tin phòng từ phiếu thuê */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-xs">
                <div className="aspect-video w-full bg-slate-100">
                  {booking.data.anhPhong ? (
                    <img
                      src={booking.data.anhPhong}
                      alt={booking.data.loaiPhong}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-teal-700">
                      <Users className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Phiếu thuê đã hoàn thành
                  </span>
                  <h2 className="text-base font-bold text-slate-900">{booking.data.loaiPhong}</h2>
                  {matchedAppointment?.diaChiPhong && (
                    <p className="flex items-start gap-1.5 text-xs text-slate-600">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-700 mt-0.5" />
                      <span>{matchedAppointment.diaChiPhong}</span>
                    </p>
                  )}
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sau khi đăng bài, người dùng khác có thể gửi đơn đăng ký và bạn có thể duyệt trực tiếp trên trang chi tiết bài.
                  </p>
                </div>
              </Card>
            </div>

            {/* Cột phải: Form */}
            <div className="lg:col-span-8">
              <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                <RoommateForm
                  defaultArea={resolvedRoomArea}
                  defaultUtilities={booking.data}
                  pending={mutation.isPending}
                  error={mutation.error}
                  onSave={mutation.mutate}
                />
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 4. TRANG CHI TIẾT BÀI Ở GHÉP (/roommates/:id) — CẢ 2 VAI TRÒ
// -----------------------------------------------------------------------------
export function RoommateDetailPage() {
  const { id = '' } = useParams();
  const currentUser = useAuthStore((state) => state.user);
  const userId = currentUser?.maNguoiDung;
  const location = useLocation();
  const client = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState<{ contextId: string; title: string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RoommateApplication | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [appFilter, setAppFilter] = useState<'ALL' | 'CHO_DUYET' | 'DA_DUYET'>('ALL');

  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');

  // Form state for Apply Modal
  const [applyPhone, setApplyPhone] = useState('');
  const [applyGender, setApplyGender] = useState<'NAM' | 'NU' | 'KHAC'>('NAM');
  const [applyJob, setApplyJob] = useState('');
  const [applyNote, setApplyNote] = useState('');
  const [applyError, setApplyError] = useState('');

  const detail = useQuery({
    queryKey: ['roommates', 'detail', id, userId],
    queryFn: () => roommateService.detail(id),
    retry: false,
  });

  const post = detail.data;
  const open = post?.trangThai === 'DANG_TIM';
  const isOwner = Boolean(post?.chuBai);

  const roomDetailQuery = useQuery({
    queryKey: ['rooms', 'detail', post?.maPhongTro],
    queryFn: () => roomService.getRoomDetail(post!.maPhongTro),
    enabled: Boolean(post?.maPhongTro),
    staleTime: 60_000,
    retry: false,
  });

  const roomDetail = roomDetailQuery.data;
  const roomImages = useMemo(() => {
    const urls: string[] = [];
    if (post?.anhPhong) urls.push(post.anhPhong);
    for (const img of roomDetail?.dsHinhAnh ?? []) {
      const u = (img as { url?: string; duongDan?: string }).url || (img as { duongDan?: string }).duongDan;
      if (u && !urls.includes(u)) urls.push(u);
    }
    for (const img of roomDetail?.hinhAnh ?? []) {
      if (img.duongDan && !urls.includes(img.duongDan)) urls.push(img.duongDan);
    }
    return urls;
  }, [post?.anhPhong, roomDetail?.dsHinhAnh, roomDetail?.hinhAnh]);

  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const activePhotoUrl = roomImages[selectedPhotoIdx] || roomImages[0] || null;

  const myAppQuery = useQuery({
    queryKey: ['roommates', 'my-application', id, userId],
    queryFn: () => roommateService.myApplicationForPost(id),
    enabled: Boolean(userId) && Boolean(post) && !isOwner,
    retry: false,
  });

  const myAppsHistoryQuery = useQuery({
    queryKey: ['roommates', 'my-applications', userId],
    queryFn: roommateService.myApplications,
    enabled: Boolean(userId) && Boolean(post) && !isOwner,
    staleTime: 60_000,
    retry: false,
  });

  const openApplyModal = () => {
    const currentApp = myAppQuery.data;
    const latestPrevApp = myAppsHistoryQuery.data?.[0];
    let savedDraft: Partial<RoommateApplyInput> | null = null;
    if (userId) {
      try {
        const raw = localStorage.getItem(`innfinder_roommate_apply_${userId}`);
        if (raw) savedDraft = JSON.parse(raw) as Partial<RoommateApplyInput>;
      } catch {
        savedDraft = null;
      }
    }

    setApplyPhone(currentApp?.sdtLienHe || currentUser?.sdt || savedDraft?.sdtLienHe || '');
    setApplyGender(
      (currentApp?.gioiTinh || savedDraft?.gioiTinh || 'NAM') as 'NAM' | 'NU' | 'KHAC',
    );
    setApplyJob(currentApp?.ngheNghiep || savedDraft?.ngheNghiep || '');
    setApplyNote(
      currentApp?.loiNhan ||
        savedDraft?.loiNhan ||
        (latestPrevApp ? '' : ''),
    );
    setApplyError('');
    setApplyModalOpen(true);
  };

  const hostAppsQuery = useQuery({
    queryKey: ['roommates', 'applications', id, userId],
    queryFn: () => roommateService.applications(id),
    enabled: Boolean(userId) && isOwner,
    retry: false,
  });

  const comments = useInfiniteQuery({
    queryKey: ['roommates', 'comments', id],
    queryFn: ({ pageParam }) => roommateService.comments(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: detail.isSuccess,
    retry: false,
  });

  const refreshAll = () => client.invalidateQueries({ queryKey: ['roommates'] });

  const editMutation = useMutation({
    mutationFn: (input: RoommateInput) => roommateService.edit(id, input),
    onSuccess: async () => {
      toast.success('Đã cập nhật bài ở ghép');
      await refreshAll();
      setEditing(false);
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => roommateService.close(id),
    onSuccess: async () => {
      toast.success('Đã đóng bài ở ghép');
      await refreshAll();
    },
  });

  const applyMutation = useMutation({
    mutationFn: (input: RoommateApplyInput) => roommateService.apply(id, input),
    onSuccess: async (_res, vars) => {
      toast.success('Đã gửi đơn đăng ký ở ghép!');
      if (userId) {
        try {
          localStorage.setItem(`innfinder_roommate_apply_${userId}`, JSON.stringify(vars));
        } catch {
          // ignore storage quota errors
        }
      }
      setApplyModalOpen(false);
      await refreshAll();
    },
    onError: (err: Error) => setApplyError(err.message),
  });

  const cancelAppMutation = useMutation({
    mutationFn: (appId: string) => roommateService.cancelApplication(id, appId),
    onSuccess: async () => {
      toast.success('Đã hủy đơn đăng ký');
      await refreshAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveMutation = useMutation({
    mutationFn: (appId: string) => roommateService.approveApplication(id, appId),
    onSuccess: async () => {
      toast.success('Đã duyệt người ở ghép!');
      await refreshAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ appId, reason }: { appId: string; reason?: string }) =>
      roommateService.rejectApplication(id, appId, reason),
    onSuccess: async () => {
      toast.success('Đã từ chối đơn đăng ký');
      setRejectTarget(null);
      setRejectReason('');
      await refreshAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendComment = useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId?: string | null }) =>
      roommateService.comment(id, body, parentId),
    onSuccess: async (_res, vars) => {
      if (vars.parentId) {
        setReplyText('');
        setReplyTo(null);
      } else {
        setComment('');
      }
      await client.invalidateQueries({ queryKey: ['roommates', 'comments', id] });
    },
  });

  const handleSubmitApply = (e: FormEvent) => {
    e.preventDefault();
    const res = roommateApplySchema.safeParse({
      sdtLienHe: applyPhone,
      gioiTinh: applyGender,
      ngheNghiep: applyJob,
      loiNhan: applyNote,
    });
    if (!res.success) {
      setApplyError(res.error.issues[0].message);
      return;
    }
    setApplyError('');
    applyMutation.mutate(res.data);
  };

  const myApp = myAppQuery.data;
  const hostApps = hostAppsQuery.data ?? [];
  const filteredHostApps =
    appFilter === 'ALL' ? hostApps : hostApps.filter((a) => a.trangThai === appFilter);
  const pendingCount = hostApps.filter((a) => a.trangThai === 'CHO_DUYET').length;

  return (
    <div className="flex-1 bg-slate-50">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {detail.isPending && <LoadingSpinner fullHeight label="Đang tải bài ở ghép..." />}

        {detail.error && (
          <EmptyState
            title="Không tìm thấy bài ở ghép"
            description={detail.error.message}
            action={
              <Link
                to="/roommates"
                className="rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white"
              >
                Về danh sách ở ghép
              </Link>
            }
          />
        )}

        {post && (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* CỘT TRÁI (8/12): Thông tin bài & Hỏi đáp */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-xs">
                {activePhotoUrl && (
                  <div className="bg-slate-900/5">
                    <div className="relative aspect-[16/9] max-h-96 w-full overflow-hidden bg-slate-100">
                      <img
                        src={activePhotoUrl}
                        alt={post.khuVuc}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {roomImages.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 bg-white border-b border-slate-100">
                        {roomImages.map((imgUrl, idx) => (
                          <button
                            key={imgUrl}
                            type="button"
                            onClick={() => setSelectedPhotoIdx(idx)}
                            className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all cursor-pointer ${
                              idx === selectedPhotoIdx
                                ? 'border-teal-700 ring-2 ring-teal-700/20'
                                : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={imgUrl} alt={`Ảnh ${idx + 1}`} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            open ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {open
                            ? `Đang tìm (${post.soSlotDaDuyet ?? 0}/${post.soNguoiCanTim} chỗ đã nhận)`
                            : 'Đã đủ người'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {GENDER_LABELS[post.gioiTinhUuTien ?? 'KHONG_YEU_CAU']}
                        </span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                        Cần thêm {post.soNguoiCanTim} người ở ghép
                      </h1>
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                        <MapPin className="h-4 w-4 text-teal-700 shrink-0" />
                        <span>{post.khuVuc} · {post.loaiPhong}</span>
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-500">Chi phí dự kiến</p>
                      <p className="text-xl font-extrabold text-teal-700">
                        {roommatePrice(post.chiPhiMoiNguoi)}
                      </p>
                    </div>
                  </div>

                  {/* Thông số tóm tắt */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs">
                    <div>
                      <p className="text-slate-500">Ngày vào ở</p>
                      <p className="mt-0.5 font-bold text-slate-900 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-teal-700" />
                        {roommateDate(post.ngayVaoO)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Người đăng</p>
                      <p className="mt-0.5 font-bold text-slate-900">
                        {post.tenNguoiDang || 'Thành viên InnFinder'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Tiến độ ghép</p>
                      <p className="mt-0.5 font-bold text-teal-700">
                        {post.soSlotDaDuyet ?? 0} / {post.soNguoiCanTim} người
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Giá điện</p>
                      <p className="mt-0.5 font-bold text-slate-900 flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        {(post.giaDien ?? roomDetail?.giaDien) != null
                          ? `${Number(post.giaDien ?? roomDetail?.giaDien).toLocaleString('vi-VN')} ₫/kWh`
                          : 'Thỏa thuận'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Giá nước</p>
                      <p className="mt-0.5 font-bold text-slate-900 flex items-center gap-1">
                        <Droplets className="h-3.5 w-3.5 text-sky-500" />
                        {(post.giaNuoc ?? roomDetail?.giaNuoc?.gia) != null
                          ? `${Number(post.giaNuoc ?? roomDetail?.giaNuoc?.gia).toLocaleString('vi-VN')} ₫/${
                              (post.giaNuocTheoNguoi ?? roomDetail?.giaNuoc?.theoNguoi) ? 'người' : 'm³'
                            }`
                          : 'Thỏa thuận'}
                      </p>
                    </div>
                  </div>

                  {/* Tiêu chí / Thói quen */}
                  {post.tieuChi && post.tieuChi.length > 0 && (
                    <div className="space-y-2">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Tiêu chí & thói quen sinh hoạt
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {post.tieuChi.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50/70 px-3 py-1 text-xs font-semibold text-teal-800"
                          >
                            <Check className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mô tả */}
                  <div className="space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Mô tả chi tiết
                    </h2>
                    <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-slate-700">
                      {post.moTa}
                    </p>
                  </div>

                  {/* Form sửa bài cho Chủ bài */}
                  {isOwner && open && editing && (
                    <div className="border-t border-slate-100 pt-5">
                      <h3 className="mb-3 text-base font-bold text-slate-900">Chỉnh sửa bài đăng</h3>
                      <RoommateForm
                        initial={{
                          ...post,
                          giaDien: post.giaDien ?? roomDetail?.giaDien ?? undefined,
                          giaNuoc: post.giaNuoc ?? roomDetail?.giaNuoc?.gia ?? undefined,
                          giaNuocTheoNguoi:
                            post.giaNuocTheoNguoi ?? roomDetail?.giaNuoc?.theoNguoi ?? undefined,
                        }}
                        pending={editMutation.isPending || closeMutation.isPending}
                        error={editMutation.error}
                        onSave={editMutation.mutate}
                      />
                    </div>
                  )}
                </div>
              </Card>

              {/* Khu vực Hỏi đáp & Trả lời bình luận */}
              <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-teal-700" />
                  <h2 id="roommate-discussion" className="text-lg font-bold text-slate-900">
                    Hỏi đáp công khai
                  </h2>
                </div>

                {open &&
                  (userId ? (
                    <form
                      className="space-y-2.5"
                      aria-label="Gửi bình luận"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const result = roommateCommentSchema.safeParse(comment);
                        if (!result.success) {
                          setCommentError(result.error.issues[0].message);
                          return;
                        }
                        setCommentError('');
                        sendComment.mutate({ body: result.data });
                      }}
                    >
                      <textarea
                        required
                        maxLength={1000}
                        rows={3}
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        placeholder="Đặt câu hỏi về giờ giấc, tiền điện nước hoặc điều kiện ở ghép..."
                        className={inputClass}
                      />
                      {(commentError || sendComment.error) && (
                        <p role="alert" className="text-xs font-semibold text-rose-600">
                          {commentError || sendComment.error?.message}
                        </p>
                      )}
                      <Button
                        type="submit"
                        isDisabled={sendComment.isPending}
                        className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white hover:bg-teal-800"
                      >
                        {sendComment.isPending ? 'Đang gửi...' : 'Gửi bình luận'}
                      </Button>
                    </form>
                  ) : (
                    <Link
                      to="/login"
                      state={{ authBackground: location, from: location }}
                      className="inline-block rounded-xl border border-teal-700 px-4 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50"
                    >
                      Đăng nhập để gửi câu hỏi
                    </Link>
                  ))}

                {comments.isPending && <LoadingSpinner label="Đang tải bình luận..." />}
                {comments.error && (
                  <p className="text-xs font-semibold text-rose-600">{comments.error.message}</p>
                )}
                {comments.data && comments.data.pages[0].items.length === 0 && (
                  <p className="text-sm text-slate-500">Chưa có câu hỏi nào.</p>
                )}

                <ul className="space-y-3">
                  {comments.data?.pages
                    .flatMap((page) => page.items)
                    .map((item) => (
                      <li
                        key={item.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900">
                              {item.tenNguoiViet}{' '}
                              {item.chuBai && (
                                <span className="ml-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800">
                                  Chủ bài
                                </span>
                              )}
                            </p>
                            {open && userId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyTo(
                                    replyTo?.id === item.id
                                      ? null
                                      : { id: item.id, author: item.tenNguoiViet },
                                  );
                                  setReplyText('');
                                  setReplyError('');
                                }}
                                className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                              >
                                {replyTo?.id === item.id ? 'Đóng' : 'Trả lời'}
                              </button>
                            )}
                          </div>
                          <time dateTime={item.guiLuc} className="text-[11px] text-slate-500">
                            {new Date(item.guiLuc).toLocaleString('vi-VN')}
                          </time>
                          <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-slate-800">
                            {item.noiDung}
                          </p>
                        </div>

                        {item.replies && item.replies.length > 0 && (
                          <ul className="ml-4 space-y-2 border-l-2 border-teal-200 pl-4">
                            {item.replies.map((reply) => (
                              <li key={reply.id} className="rounded-xl bg-white p-3 border border-slate-100">
                                <p className="text-xs font-bold text-slate-900">
                                  {reply.tenNguoiViet}{' '}
                                  {reply.chuBai && (
                                    <span className="ml-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                                      Chủ bài
                                    </span>
                                  )}
                                </p>
                                <time dateTime={reply.guiLuc} className="text-[11px] text-slate-400">
                                  {new Date(reply.guiLuc).toLocaleString('vi-VN')}
                                </time>
                                <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm text-slate-700">
                                  {reply.noiDung}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}

                        {open && userId && replyTo?.id === item.id && (
                          <form
                            className="ml-4 space-y-2 border-l-2 border-teal-200 pl-4"
                            onSubmit={(event) => {
                              event.preventDefault();
                              const result = roommateCommentSchema.safeParse(replyText);
                              if (!result.success) {
                                setReplyError(result.error.issues[0].message);
                                return;
                              }
                              setReplyError('');
                              sendComment.mutate({ body: result.data, parentId: item.id });
                            }}
                          >
                            <p className="text-xs text-slate-500">
                              Đang trả lời <strong className="text-slate-800">{replyTo.author}</strong>
                            </p>
                            <textarea
                              required
                              maxLength={1000}
                              rows={2}
                              value={replyText}
                              onChange={(event) => setReplyText(event.target.value)}
                              placeholder="Nhập câu trả lời..."
                              className={inputClass}
                            />
                            {(replyError || sendComment.error) && (
                              <p role="alert" className="text-xs font-semibold text-rose-600">
                                {replyError || sendComment.error?.message}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <Button
                                type="submit"
                                size="sm"
                                isDisabled={sendComment.isPending}
                                className="rounded-lg bg-teal-700 px-4 py-1.5 text-xs font-bold text-white"
                              >
                                Gửi trả lời
                              </Button>
                              <button
                                type="button"
                                onClick={() => setReplyTo(null)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </form>
                        )}
                      </li>
                    ))}
                </ul>

                {comments.hasNextPage && (
                  <Button
                    variant="outline"
                    isDisabled={comments.isFetchingNextPage}
                    onPress={() => void comments.fetchNextPage()}
                  >
                    Xem bình luận cũ hơn
                  </Button>
                )}
              </Card>
            </div>

            {/* CỘT PHẢI (4/12 Sticky): Hành động theo vai trò */}
            <div className="lg:col-span-4 space-y-5">
              <div className="sticky top-20 space-y-5">
                {/* VAI TRÒ 1: NGƯỜI ĐĂNG KÝ Ở GHÉP */}
                {!isOwner && (
                  <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
                    <h2 className="text-base font-bold text-slate-900">Đăng ký ở ghép</h2>

                    {!userId ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Đăng nhập để gửi đơn đăng ký ở ghép và trao đổi thông tin liên hệ với chủ bài.
                        </p>
                        <Link
                          to="/login"
                          state={{ authBackground: location, from: location }}
                          className="block w-full rounded-xl bg-teal-700 py-3 text-center text-sm font-bold text-white hover:bg-teal-800"
                        >
                          Đăng nhập để đăng ký
                        </Link>
                      </div>
                    ) : myApp ? (
                      <div className="space-y-3">
                        <div
                          className={`rounded-xl border p-3.5 text-xs space-y-1.5 ${
                            (APP_STATUS_UI[myApp.trangThai] || APP_STATUS_UI.CHO_DUYET).badgeClass
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            {myApp.trangThai === 'DA_DUYET' ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : myApp.trangThai === 'CHO_DUYET' ? (
                              <Clock className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            <span>{(APP_STATUS_UI[myApp.trangThai] || APP_STATUS_UI.CHO_DUYET).label}</span>
                          </div>
                          <p className="opacity-90">
                            Nghề nghiệp: {myApp.ngheNghiep} · SĐT: {myApp.sdtLienHe}
                          </p>
                          {myApp.trangThai === 'TU_CHOI' && myApp.lyDoTuChoi && (
                            <p className="font-medium">Lý do: {myApp.lyDoTuChoi}</p>
                          )}
                        </div>

                        {userId && (
                          <button
                            type="button"
                            onClick={() =>
                              setChatTarget({
                                contextId: `${post.id}__${userId}`,
                                title: `Ở ghép · ${post.khuVuc}`,
                              })
                            }
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 py-2.5 text-xs font-bold text-white hover:bg-teal-800 cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Nhắn tin với chủ bài</span>
                          </button>
                        )}

                        {myApp.trangThai === 'CHO_DUYET' && (
                          <button
                            type="button"
                            disabled={cancelAppMutation.isPending}
                            onClick={() => cancelAppMutation.mutate(myApp.id)}
                            className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                          >
                            {cancelAppMutation.isPending ? 'Đang hủy...' : 'Hủy đơn đăng ký'}
                          </button>
                        )}

                        {open && (myApp.trangThai === 'TU_CHOI' || myApp.trangThai === 'DA_HUY') && (
                          <button
                            type="button"
                            onClick={openApplyModal}
                            className="w-full rounded-xl bg-teal-700 py-2.5 text-xs font-bold text-white hover:bg-teal-800 cursor-pointer"
                          >
                            Gửi lại đơn đăng ký
                          </button>
                        )}
                      </div>
                    ) : open ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Gửi thông tin giới thiệu bản thân để chủ bài xem xét. Khi được duyệt, số chỗ sẽ tự động cập nhật.
                        </p>
                        <button
                          type="button"
                          onClick={openApplyModal}
                          className="w-full rounded-xl bg-teal-700 py-3 text-sm font-bold text-white shadow-xs hover:bg-teal-800 cursor-pointer"
                        >
                          Đăng ký ở ghép ngay
                        </button>
                        {userId && (
                          <button
                            type="button"
                            onClick={() =>
                              setChatTarget({
                                contextId: `${post.id}__${userId}`,
                                title: `Ở ghép · ${post.khuVuc}`,
                              })
                            }
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-teal-700 bg-teal-50 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-100 cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Nhắn tin với chủ bài</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="rounded-xl bg-slate-100 p-3 text-xs font-semibold text-slate-600">
                        Bài đăng này đã đủ người ở ghép.
                      </p>
                    )}
                  </Card>
                )}

                {/* VAI TRÒ 2: NGƯỜI ĐĂNG BÀI (CHỦ BÀI) */}
                {isOwner && (
                  <>
                    {open && (
                      <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
                        <h2 className="text-sm font-bold text-slate-900">Quản lý bài đăng</h2>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setEditing((value) => !value)}
                            className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            {editing ? 'Hủy sửa' : 'Sửa bài'}
                          </button>
                          <button
                            type="button"
                            disabled={closeMutation.isPending || editMutation.isPending}
                            onClick={() => {
                              if (window.confirm('Đóng bài và ngừng nhận đơn đăng ký / bình luận mới?')) {
                                closeMutation.mutate();
                              }
                            }}
                            className="flex-1 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                          >
                            Đã đủ người
                          </button>
                        </div>
                        {closeMutation.error && (
                          <p className="text-xs font-semibold text-rose-600">
                            {closeMutation.error.message}
                          </p>
                        )}
                      </Card>
                    )}

                    <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-teal-700" />
                          Đơn đăng ký ({hostApps.length})
                        </h2>
                        {pendingCount > 0 && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                            {pendingCount} chờ duyệt
                          </span>
                        )}
                      </div>

                      {/* Filter trạng thái đơn */}
                      <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1 text-[11px] font-bold">
                        {(['ALL', 'CHO_DUYET', 'DA_DUYET'] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setAppFilter(tab)}
                            className={`flex-1 rounded-lg py-1.5 transition-colors cursor-pointer ${
                              appFilter === tab
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {tab === 'ALL' ? 'Tất cả' : tab === 'CHO_DUYET' ? 'Chờ duyệt' : 'Đã duyệt'}
                          </button>
                        ))}
                      </div>

                      {hostAppsQuery.isPending && <LoadingSpinner label="Đang tải đơn..." />}

                      {hostAppsQuery.isSuccess && filteredHostApps.length === 0 && (
                        <p className="py-4 text-center text-xs text-slate-500">
                          Chưa có đơn đăng ký nào trong mục này.
                        </p>
                      )}

                      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                        {filteredHostApps.map((app) => {
                          const statusUi = APP_STATUS_UI[app.trangThai] || APP_STATUS_UI.CHO_DUYET;
                          return (
                            <div
                              key={app.id}
                              className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2 text-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-bold text-slate-900 text-sm">{app.tenNguoiDangKy}</p>
                                  <p className="text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Briefcase className="h-3 w-3" />
                                    {APPLICANT_GENDER_LABEL[app.gioiTinh] || app.gioiTinh} · {app.ngheNghiep}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusUi.badgeClass}`}
                                >
                                  {statusUi.label}
                                </span>
                              </div>

                              <p className="rounded-lg bg-white p-2.5 text-slate-700 leading-relaxed border border-slate-100">
                                {app.loiNhan}
                              </p>

                              <a
                                href={`tel:${app.sdtLienHe}`}
                                className="inline-flex items-center gap-1.5 font-bold text-teal-700 hover:underline"
                              >
                                <Phone className="h-3.5 w-3.5" />
                                {app.sdtLienHe}
                              </a>

                              <button
                                type="button"
                                onClick={() =>
                                  setChatTarget({
                                    contextId: `${post.id}__${app.maNguoiDangKy}`,
                                    title: `Ở ghép · ${app.tenNguoiDangKy}`,
                                  })
                                }
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 py-2 text-xs font-bold text-white hover:bg-teal-800 cursor-pointer"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Nhắn tin với {app.tenNguoiDangKy}</span>
                              </button>

                              {app.trangThai === 'CHO_DUYET' && open && (
                                <div className="flex gap-2 pt-1">
                                  <button
                                    type="button"
                                    disabled={approveMutation.isPending || rejectMutation.isPending}
                                    onClick={() => approveMutation.mutate(app.id)}
                                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 font-bold text-white hover:bg-emerald-700 cursor-pointer"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Duyệt
                                  </button>
                                  <button
                                    type="button"
                                    disabled={approveMutation.isPending || rejectMutation.isPending}
                                    onClick={() => setRejectTarget(app)}
                                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 py-2 font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Từ chối
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL NỘP ĐƠN ĐĂNG KÝ Ở GHÉP */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Đăng ký ở ghép</h3>
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitApply} className="space-y-3.5">
              <label className="block text-xs font-semibold text-slate-700">
                Số điện thoại / Zalo liên hệ <span className="text-rose-500">*</span>
                <input
                  required
                  value={applyPhone}
                  onChange={(e) => setApplyPhone(e.target.value)}
                  placeholder="09xxxxxxxx"
                  maxLength={10}
                  className={inputClass}
                />
              </label>

              <div className="block text-xs font-semibold text-slate-700">
                <span>Giới tính</span>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(['NAM', 'NU', 'KHAC'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setApplyGender(g)}
                      className={`rounded-xl border py-2 text-xs font-bold cursor-pointer ${
                        applyGender === g
                          ? 'border-teal-700 bg-teal-50 text-teal-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {APPLICANT_GENDER_LABEL[g]}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-xs font-semibold text-slate-700">
                Nghề nghiệp / Trường học <span className="text-rose-500">*</span>
                <input
                  required
                  value={applyJob}
                  onChange={(e) => setApplyJob(e.target.value)}
                  placeholder="Ví dụ: Sinh viên năm 3 ĐH Công Nghiệp"
                  maxLength={80}
                  className={inputClass}
                />
              </label>

              <label className="block text-xs font-semibold text-slate-700">
                Giới thiệu ngắn về bạn <span className="text-rose-500">*</span>
                <textarea
                  required
                  rows={3}
                  value={applyNote}
                  onChange={(e) => setApplyNote(e.target.value)}
                  placeholder="Thói quen sinh hoạt, thời gian dự kiến dọn vào..."
                  maxLength={500}
                  className={inputClass}
                />
              </label>

              {applyError && (
                <p role="alert" className="text-xs font-semibold text-rose-600">
                  {applyError}
                </p>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={applyMutation.isPending}
                  className="flex-1 rounded-xl bg-teal-700 py-2.5 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50 cursor-pointer"
                >
                  {applyMutation.isPending ? 'Đang gửi...' : 'Gửi đơn đăng ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TỪ CHỐI ĐƠN ĐĂNG KÝ */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Từ chối đơn của {rejectTarget.tenNguoiDangKy}?
            </h3>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối (tùy chọn)..."
              maxLength={300}
              className={inputClass}
            />
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({ appId: rejectTarget.id, reason: rejectReason })
                }
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
              >
                {rejectMutation.isPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatDrawer
        open={Boolean(chatTarget)}
        channelType="ROOMMATE"
        contextId={chatTarget?.contextId || ''}
        onClose={() => setChatTarget(null)}
        fallbackTitle={chatTarget?.title}
      />
    </div>
  );
}
