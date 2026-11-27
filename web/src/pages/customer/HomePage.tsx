import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/common/PageContainer";
import { PopularAreaCard } from "@/components/room/PopularAreaCard";
import { RecommendedRoomsSection } from "@/components/room/RecommendedRoomsSection";
import { DepositMechanismSection } from "@/components/room/landing/DepositMechanismSection";
import { FaqSection } from "@/components/room/landing/FaqSection";
import { FeaturedRoomsSection } from "@/components/room/landing/FeaturedRoomsSection";
import { RoommateLanding } from "@/components/roommate/RoommateCards";
import { HeroSection } from "@/components/room/landing/HeroSection";
import { roomService } from "@/services/room.service";
import { useAuthStore } from "@/store/useAuthStore";
import { formatVNDShort } from "@/utils/formatters";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isChuTro } = useAuthStore();

  const {
    data: popularAreas = [],
    isLoading: areasLoading,
    isError: areasError,
    refetch: refetchAreas,
  } = useQuery({
    queryKey: ["rooms", "popular-areas"],
    queryFn: roomService.getPopularAreas,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const handleLandlordAction = () => {
    if (isAuthenticated && isChuTro) {
      navigate("/landlord/rooms/create");
      return;
    }
    if (isAuthenticated) {
      navigate("/profile");
      return;
    }
    navigate("/register");
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col">
      {/* 1. Hero Section + Tìm kiếm thường / AI */}
      <HeroSection />
      <FeaturedRoomsSection />
      {!isChuTro && <RoommateLanding />}

      {/* 2. Khu vực phổ biến */}
      <PageContainer width="wide" className="py-10 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Khu vực phổ biến
            </h2>
          </div>
          <Link
            to="/search/map"
            className="text-sm font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 shrink-0"
          >
            <span>Xem bản đồ</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {areasLoading ? (
          <div
            aria-label="Đang tải khu vực phổ biến"
            aria-busy="true"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="h-44 sm:h-52 rounded-2xl bg-slate-200 animate-pulse"
              />
            ))}
          </div>
        ) : areasError ? (
          <div
            role="alert"
            className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
          >
            <p>Chưa tải được khu vực phổ biến.</p>
            <button
              type="button"
              onClick={() => void refetchAreas()}
              className="mt-2 font-semibold text-teal-700 hover:underline cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : popularAreas.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Chưa có khu vực đủ thông tin để hiển thị. Bạn có thể xem các phòng
            đang đăng trên bản đồ.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {popularAreas.map((area) => (
              <PopularAreaCard
                key={area.keyword}
                name={area.name}
                roomCountText={
                  area.roomCount +
                  " phòng" +
                  (area.minPrice !== null
                    ? " · từ " + formatVNDShort(area.minPrice)
                    : "")
                }
                keyword={area.keyword}
                imageUrl={area.imageUrl}
              />
            ))}
          </div>
        )}
      </PageContainer>

      {/* 4b. Gợi ý phòng cá nhân hóa (AI Hybrid Recommendation) */}
      <RecommendedRoomsSection />

      {/* 5. Quy trình đặt lịch & Bảo chứng cọc 4 bước */}
      <div id="deposit-mechanism" className="scroll-mt-20">
        <DepositMechanismSection />
      </div>

      {/* 6. Câu hỏi thường gặp */}
      <FaqSection />

      {/* 8. Final Conversion CTA */}
      <section className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <PageContainer width="wide">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Sẵn sàng tìm phòng ưng ý hoặc cho thuê phòng minh bạch?
              </h2>
              <p className="text-sm text-slate-300">
                Trải nghiệm tìm kiếm trên bản đồ, đặt lịch xem phòng an toàn và
                quản lý giao dịch rõ ràng ngay hôm nay.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => navigate("/search")}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold shadow-sm shadow-teal-600/25 transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Tìm phòng ngay</span>
              </button>
              <button
                type="button"
                onClick={handleLandlordAction}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-sm font-semibold transition-colors cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>Đăng tin cho thuê</span>
              </button>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
};
