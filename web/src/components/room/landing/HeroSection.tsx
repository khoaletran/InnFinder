import React, { useState } from 'react';
import { Card } from '@heroui/react';
import { Award, CheckCircle2, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppButton } from '@/components/common/AppButton';
import { PageContainer } from '@/components/common/PageContainer';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';

const QUICK_TAGS = [
  'Bình Thạnh',
  'Quận 3',
  'TP. Thủ Đức',
  'Gần ĐH Bách Khoa',
  'Gần tuyến Metro',
];

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { setKeyword, resetFilter } = useRoomFilterStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'normal' | 'ai'>('normal');

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    resetFilter();
    setKeyword(trimmed);
    const params = new URLSearchParams();
    if (trimmed) params.set('keyword', trimmed);
    if (searchMode === 'ai') params.set('ai', '1');
    const queryString = params.toString();
    navigate(queryString ? `/search?${queryString}` : '/search');
  };

  const handleQuickTagClick = (tag: string) => {
    resetFilter();
    setKeyword(tag);
    navigate(`/search?keyword=${encodeURIComponent(tag)}`);
  };

  return (
    <section className="relative bg-gradient-to-b from-teal-50/70 via-white to-white border-b border-slate-200 overflow-hidden">
      <PageContainer width="wide" className="py-10 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Cột trái: Nội dung chính & Thanh tìm kiếm */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Phòng trọ kiểm duyệt thực tế, thông tin minh bạch</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Tìm phòng trọ minh bạch,{' '}
              <span className="text-teal-600">đặt lịch xem an toàn</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
              Đối chiếu giá thuê, ảnh thật và tọa độ trực tiếp trên bản đồ. Đặt lịch hẹn nhanh chóng với cơ chế{' '}
              <span className="font-semibold text-slate-800">hoàn 100% cọc giữ chân</span> ngay tại buổi xem phòng.
            </p>

            {/* Thanh tìm kiếm kèm chuyển đổi Tìm thường / AI Semantic Search */}
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSearchMode('normal')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    searchMode === 'normal'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-teal-600" />
                  <span>Tìm theo khu vực</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('ai')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    searchMode === 'ai'
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tìm bằng AI</span>
                </button>
              </div>

              <form
                onSubmit={handleHeroSearch}
                className="bg-white rounded-2xl p-2 border border-slate-300 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-500/20"
              >
                <div className="flex-1 flex items-center gap-3 px-3">
                  {searchMode === 'ai' ? (
                    <Sparkles className="w-5 h-5 text-teal-600 shrink-0" />
                  ) : (
                    <Search className="w-5 h-5 text-teal-600 shrink-0" />
                  )}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      searchMode === 'ai'
                        ? 'VD: Phòng có gác gần ĐH Bách Khoa dưới 3,5 triệu, yên tĩnh...'
                        : 'Nhập quận, tên đường, trường học...'
                    }
                    className="w-full h-10 text-sm font-medium text-slate-900 bg-transparent outline-none placeholder:text-slate-400"
                  />
                </div>
                <AppButton type="submit" variant="primary" size="lg">
                  {searchMode === 'ai' ? 'Tìm bằng AI' : 'Tìm phòng ngay'}
                </AppButton>
              </form>
            </div>

            {/* Gợi ý nhanh */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Gợi ý:</span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleQuickTagClick(tag)}
                  className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-800 font-medium transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Cột phải: Thẻ minh họa trực quan phòng trọ chuẩn InnFinder */}
          <div className="lg:col-span-5 hidden lg:block">
            <div className="relative">
              <Card className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden p-0">
                <div className="relative h-56 bg-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"
                    alt="Phòng trọ mẫu đã kiểm duyệt trên InnFinder"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-600 text-white text-xs font-semibold shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Đã kiểm duyệt</span>
                  </div>
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/95 text-slate-900 text-xs font-extrabold shadow-xs">
                    3,5 tr/tháng
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <p className="text-sm font-bold truncate">
                      Phòng Studio ban công thoáng mát · 28 m²
                    </p>
                    <p className="text-xs text-slate-200 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                      <span>Quận Bình Thạnh, TP. Hồ Chí Minh</span>
                    </p>
                  </div>
                </div>

                <Card.Content className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      Hoàn 100% cọc giữ chân
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      Uy tín 100/100
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span>Xem vị trí thực tế ngay trên bản đồ</span>
                    <button
                      type="button"
                      onClick={() => navigate('/search')}
                      className="font-bold text-teal-700 hover:text-teal-800 cursor-pointer"
                    >
                      Khám phá ngay →
                    </button>
                  </div>
                </Card.Content>
              </Card>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
};
