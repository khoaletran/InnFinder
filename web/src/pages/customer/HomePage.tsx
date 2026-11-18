import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Home as HomeIcon, MapPin, Search, ShieldCheck } from 'lucide-react';
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
    roomCountText: 'Bình Thạnh · Quận 3 · Quận 7',
    keyword: 'Hồ Chí Minh',
    imageUrl: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
  },
  {
    id: 'hn',
    name: 'Hà Nội',
    roomCountText: 'Cầu Giấy · Đống Đa · Thanh Xuân',
    keyword: 'Hà Nội',
    imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800',
  },
  {
    id: 'dn',
    name: 'Đà Nẵng',
    roomCountText: 'Hải Châu · Sơn Trà · Ngũ Hành Sơn',
    keyword: 'Đà Nẵng',
    imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800',
  },
  {
    id: 'bd',
    name: 'Bình Dương',
    roomCountText: 'Dĩ An · Thuận An · Thủ Dầu Một',
    keyword: 'Bình Dương',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800',
  },
];

const QUICK_TAGS = [
  'Gần ĐH Bách Khoa',
  'Bình Thạnh',
  'Gần tuyến Metro',
  'Quận 3',
  'Gần ĐH Quốc Gia',
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { setKeyword, setPriceRange, setCategoryId } = useRoomFilterStore();

  const [searchLocation, setSearchLocation] = useState('Quận 3, TP. Hồ Chí Minh');
  const [selectedPriceLabel, setSelectedPriceLabel] = useState('Tất cả');
  const [selectedRoomType, setSelectedRoomType] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'room-types'],
    queryFn: roomService.getRoomTypes,
  });

  const { data: roomsPage, isLoading } = useQuery({
    queryKey: ['rooms', 'home-recent'],
    queryFn: () => roomService.searchRooms({ page: 0, size: 8 }),
  });

  const recentRooms = roomsPage?.content || [];

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <section className="relative bg-teal-50/40 border-b border-teal-100/60 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-7">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 text-teal-800 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                100% phòng trọ hiển thị đã qua kiểm duyệt DA_DUYET
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
                Tìm phòng trọ <br className="hidden sm:block" />
                phù hợp với bạn
              </h1>

              <p className="text-slate-600 text-base sm:text-lg max-w-xl leading-relaxed">
                Khám phá phòng thật, đặt lịch xem phòng có bảo chứng cọc giữ chân và kết nối trực
                tiếp với chủ trọ uy tín trên sàn InnFinder.
              </p>

              <form
                onSubmit={handleHeroSearch}
                className="bg-white rounded-3xl sm:rounded-full p-2.5 sm:p-2 border border-slate-200/90 shadow-xl shadow-teal-900/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
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
                      placeholder="Quận, huyện hoặc địa chỉ..."
                      className="w-full text-xs sm:text-sm font-semibold text-slate-900 bg-transparent outline-none truncate placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="hidden sm:block w-px h-8 bg-slate-200" />

                <div className="px-4 py-2 hover:bg-slate-50 rounded-2xl sm:rounded-full transition-colors">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Khoảng giá
                  </span>
                  <select
                    value={selectedPriceLabel}
                    onChange={(e) => setSelectedPriceLabel(e.target.value)}
                    className="text-xs sm:text-sm font-semibold text-slate-900 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="Tất cả">Tất cả mức giá</option>
                    <option value="Dưới 3 triệu">Dưới 3 triệu</option>
                    <option value="3–5 triệu">3–5 triệu</option>
                    <option value="5–8 triệu">5–8 triệu</option>
                    <option value="Trên 8 triệu">Trên 8 triệu</option>
                  </select>
                </div>

                <div className="hidden sm:block w-px h-8 bg-slate-200" />

                <div className="px-4 py-2 hover:bg-slate-50 rounded-2xl sm:rounded-full transition-colors">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Loại phòng
                  </span>
                  <select
                    value={selectedRoomType}
                    onChange={(e) => setSelectedRoomType(e.target.value)}
                    className="text-xs sm:text-sm font-semibold text-slate-900 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="">Tất cả loại phòng</option>
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

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3.5 rounded-2xl sm:rounded-full flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95 shrink-0 cursor-pointer"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                  <span>Tìm kiếm</span>
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
                <span className="font-semibold text-slate-600">Tìm nhiều:</span>
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleQuickTagClick(tag)}
                    className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all font-medium cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-4/3 lg:aspect-5/4">
                <img
                  src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000"
                  alt="Không gian phòng trọ tiện nghi InnFinder"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
            Xem tất cả khu vực
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 flex-1 w-full">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block mb-1">
              Mới đăng
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Phòng mới dành cho bạn
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Chỉ hiển thị các phòng đã được Quản trị viên kiểm duyệt chất lượng.
            </p>
          </div>
          <Link
            to="/search"
            className="text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 group transition-colors"
          >
            Xem tất cả phòng
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
      </section>

      <Footer />
    </div>
  );
};
