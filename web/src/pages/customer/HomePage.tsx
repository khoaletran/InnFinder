import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  Home as HomeIcon,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { Footer } from '@/components/common/Footer';
import { Header } from '@/components/common/Header';
import { PopularAreaCard } from '@/components/room/PopularAreaCard';
import { RoomCard } from '@/components/room/RoomCard';
import { roomService } from '@/services/room.service';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';

const POPULAR_AREAS = [
  {
    id: 'hcm',
    name: 'TP. Hồ Chí Minh',
    roomCountText: '12.480 phòng',
    keyword: 'Hồ Chí Minh',
    imageUrl: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
  },
  {
    id: 'hn',
    name: 'Hà Nội',
    roomCountText: '8.260 phòng',
    keyword: 'Hà Nội',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800',
  },
  {
    id: 'dn',
    name: 'Đà Nẵng',
    roomCountText: '3.120 phòng',
    keyword: 'Đà Nẵng',
    imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800',
  },
  {
    id: 'bd',
    name: 'Bình Dương',
    roomCountText: '2.740 phòng',
    keyword: 'Bình Dương',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
  },
];

const QUICK_TAGS = ['Gần ĐH Bách Khoa', 'Thảo Điền', 'Gần tuyến Metro'];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { setKeyword, setPriceRange, setCategoryId } = useRoomFilterStore();

  const [searchLocation, setSearchLocation] = useState('Quận 3, TP. Hồ Chí Minh');
  const [selectedPriceLabel, setSelectedPriceLabel] = useState('3–5 triệu');
  const [selectedRoomType, setSelectedRoomType] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'room-types'],
    queryFn: roomService.getRoomTypes,
  });

  const { data: roomsPage, isLoading } = useQuery({
    queryKey: ['rooms', 'home-feed'],
    queryFn: () => roomService.searchRooms({ page: 0, size: 16 }),
  });

  const allRooms = useMemo(() => roomsPage?.content || [], [roomsPage?.content]);

  // Danh sách phòng nổi bật sắp xếp theo điểm uy tín chủ trọ cao nhất (95 - 100 điểm)
  const highReputationRooms = useMemo(() => {
    if (!allRooms.length) return [];
    return [...allRooms]
      .sort((a, b) => (b.diemUyTinChuTro ?? 100) - (a.diemUyTinChuTro ?? 100))
      .slice(0, 4);
  }, [allRooms]);

  // Danh sách phòng mới đăng
  const recentRooms = useMemo(() => {
    return allRooms.slice(0, 8);
  }, [allRooms]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchLocation);
    if (selectedPriceLabel === 'Dưới 3 triệu') {
      setPriceRange(0, 3_000_000);
    } else if (selectedPriceLabel === '3–5 triệu') {
      setPriceRange(3_000_000, 5_000_000);
    } else if (selectedPriceLabel === '5–8 triệu') {
      setPriceRange(5_000_000, 8_000_000);
    } else if (selectedPriceLabel === 'Trên 8 triệu') {
      setPriceRange(8_000_000, undefined);
    } else {
      setPriceRange(undefined, undefined);
    }
    setCategoryId(selectedRoomType || undefined);
    navigate(`/search?keyword=${encodeURIComponent(searchLocation)}`);
  };

  const handleQuickTagClick = (tag: string) => {
    setKeyword(tag);
    navigate(`/search?keyword=${encodeURIComponent(tag)}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header dùng chung cho toàn hệ thống - không can thiệp */}
      <Header />

      {/* ==================== HERO SECTION (Nền chuyển sắc tươi sáng & Thanh tìm kiếm nổi) ==================== */}
      <section className="relative bg-gradient-to-b from-[#eef9f9] via-[#f4fbfb] to-white border-b border-teal-100/50 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Cột trái: Tiêu đề + Form tìm kiếm */}
            <div className="lg:col-span-7 space-y-7">
              {/* Badge xác thực phòng thay cho dòng chữ kỹ thuật DA_DUYET */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 border border-teal-200/60 text-teal-800 text-xs sm:text-sm font-semibold shadow-xs">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Hơn 28.000 phòng đã xác thực</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
                Tìm phòng trọ phù hợp với bạn
              </h1>

              <p className="text-slate-600 text-base sm:text-lg max-w-xl leading-relaxed">
                Khám phá phòng thật, giá minh bạch và kết nối trực tiếp với chủ trọ uy tín trên khắp Việt Nam.
              </p>

              {/* Thanh tìm kiếm nổi (Floating Search Bar) bo góc tròn chuẩn mockup */}
              <form
                onSubmit={handleHeroSearch}
                className="bg-white rounded-3xl sm:rounded-full p-2.5 sm:p-2 border border-slate-200/90 shadow-xl shadow-teal-900/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                {/* Trường Địa điểm */}
                <div className="flex-1 px-4 py-2 hover:bg-slate-50 rounded-2xl sm:rounded-full transition-colors flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-teal-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Địa điểm
                    </span>
                    <input
                      type="text"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      placeholder="Quận 3, TP. Hồ Chí Minh"
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 bg-transparent outline-none truncate placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="hidden sm:block w-px h-8 bg-slate-200" />

                {/* Trường Khoảng giá */}
                <div className="px-4 py-2 hover:bg-slate-50 rounded-2xl sm:rounded-full transition-colors min-w-[130px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Khoảng giá
                  </span>
                  <select
                    value={selectedPriceLabel}
                    onChange={(e) => setSelectedPriceLabel(e.target.value)}
                    className="text-xs sm:text-sm font-semibold text-slate-900 bg-transparent outline-none cursor-pointer w-full"
                  >
                    <option value="Tất cả">Tất cả mức giá</option>
                    <option value="Dưới 3 triệu">Dưới 3 triệu</option>
                    <option value="3–5 triệu">3–5 triệu</option>
                    <option value="5–8 triệu">5–8 triệu</option>
                    <option value="Trên 8 triệu">Trên 8 triệu</option>
                  </select>
                </div>

                <div className="hidden sm:block w-px h-8 bg-slate-200" />

                {/* Trường Loại phòng */}
                <div className="px-4 py-2 hover:bg-slate-50 rounded-2xl sm:rounded-full transition-colors min-w-[130px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Loại phòng
                  </span>
                  <select
                    value={selectedRoomType}
                    onChange={(e) => setSelectedRoomType(e.target.value)}
                    className="text-xs sm:text-sm font-semibold text-slate-900 bg-transparent outline-none cursor-pointer w-full"
                  >
                    <option value="">Phòng trọ</option>
                    {categories.map((c) => {
                      const code = c.maLpt || c.maLoaiPhong || '';
                      const label = c.tenLoaiPhongTro || c.tenLoaiPhong || code;
                      return (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Nút Tìm kiếm */}
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-7 py-3.5 rounded-2xl sm:rounded-full flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95 shrink-0 cursor-pointer"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                  <span>Tìm kiếm</span>
                </button>
              </form>

              {/* Các từ khóa tìm kiếm nhiều */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
                <span className="font-semibold text-slate-600">Tìm nhiều:</span>
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleQuickTagClick(tag)}
                    className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all font-medium cursor-pointer shadow-2xs"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Cột phải: Hình ảnh căn phòng sáng sủa, ấm cúng theo mockup */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-4/3 lg:aspect-5/4">
                <img
                  src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200"
                  alt="Không gian phòng trọ sáng sủa, tiện nghi InnFinder"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PHẦN 1: KHÁM PHÁ KHU VỰC PHỔ BIẾN (Nền Trắng Sạch Sẽ) ==================== */}
      <section className="bg-white py-14">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block mb-1">
                Khám phá
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Khu vực phổ biến
              </h2>
            </div>
            <Link
              to="/search"
              className="text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 group transition-colors"
            >
              <span>Xem tất cả khu vực</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {POPULAR_AREAS.map((area) => (
              <PopularAreaCard
                key={area.id}
                id={area.id}
                name={area.name}
                roomCountText={area.roomCountText}
                keyword={area.keyword}
                imageUrl={area.imageUrl}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PHẦN 2: PHÒNG NỔI BẬT TỪ CHỦ TRỌ UY TÍN (Nền Xám Nhạt Slate-50) ==================== */}
      <section className="bg-slate-50/90 py-16 border-y border-slate-200/70">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/90 text-amber-900 text-xs font-bold mb-2">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>TOP CHỦ TRỌ UY TÍN</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Phòng nổi bật từ Chủ trọ uy tín
                <Sparkles className="w-5 h-5 text-amber-500" />
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                Các phòng trọ có chủ nhà đạt điểm uy tín từ 95–100 điểm, cam kết dẫn xem đúng hẹn và hoàn cọc minh bạch.
              </p>
            </div>
            <Link
              to="/search"
              className="text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 group transition-colors shrink-0"
            >
              <span>Xem tất cả phòng uy tín</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-pulse"
                >
                  <div className="w-full aspect-4/3 bg-slate-200 rounded-xl" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : highReputationRooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {highReputationRooms.map((room) => (
                <RoomCard key={room.maPhongTro} room={room} layout="vertical" />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Đang cập nhật danh sách chủ trọ uy tín"
              description="Các phòng của chủ trọ có điểm uy tín cao sẽ sớm được đề xuất tại đây."
              icon={<Award className="w-7 h-7" />}
            />
          )}
        </div>
      </section>

      {/* ==================== PHẦN 3: PHÒNG MỚI DÀNH CHO BẠN (Nền Trắng Sạch Sẽ) ==================== */}
      <section className="bg-white py-16 flex-1 w-full">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block mb-1">
                Mới đăng
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Phòng mới dành cho bạn
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Cập nhật theo tiêu chí tìm kiếm gần đây của bạn.
              </p>
            </div>
            <Link
              to="/search"
              className="text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 group transition-colors"
            >
              <span>Xem 240 phòng</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-pulse"
                >
                  <div className="w-full aspect-4/3 bg-slate-200 rounded-xl" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : recentRooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentRooms.map((room) => (
                <RoomCard key={room.maPhongTro} room={room} layout="vertical" />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có phòng mới nào"
              description="Hãy thử tìm kiếm theo khu vực hoặc bộ lọc nâng cao để xem thêm phòng trọ."
              icon={<HomeIcon className="w-7 h-7" />}
            />
          )}
        </div>
      </section>

      {/* Footer chân trang */}
      <Footer />
    </div>
  );
};
