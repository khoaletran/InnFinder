// web/src/components/layout/Footer.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Home, ShieldCheck, Headphones, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Cột 1: Thông tin thương hiệu */}
          <div className="md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
                <Home className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                TrọTốt
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nền tảng tìm kiếm phòng trọ, căn hộ dịch vụ và kết nối trực tiếp với
              chủ nhà uy tín hàng đầu Việt Nam.
            </p>
            <div className="flex items-center gap-2 text-xs text-teal-400">
              <ShieldCheck className="w-4 h-4" />
              <span>100% phòng trọ được xác thực</span>
            </div>
          </div>

          {/* Cột 2: Dành cho khách thuê */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Dành cho khách thuê</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/search" className="hover:text-teal-400 transition-colors">
                  Tìm kiếm phòng trọ
                </Link>
              </li>
              <li>
                <Link to="/search" className="hover:text-teal-400 transition-colors">
                  Tìm phòng theo bản đồ
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="hover:text-teal-400 transition-colors">
                  Phòng yêu thích đã lưu
                </Link>
              </li>
              <li>
                <span className="hover:text-teal-400 cursor-pointer transition-colors">
                  Cẩm nang thuê phòng an toàn
                </span>
              </li>
            </ul>
          </div>

          {/* Cột 3: Dành cho chủ trọ */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Dành cho chủ trọ</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <span className="hover:text-teal-400 cursor-pointer transition-colors">
                  Đăng tin cho thuê phòng
                </span>
              </li>
              <li>
                <span className="hover:text-teal-400 cursor-pointer transition-colors">
                  Bảng giá dịch vụ xác thực
                </span>
              </li>
              <li>
                <span className="hover:text-teal-400 cursor-pointer transition-colors">
                  Quy định kiểm duyệt tin đăng
                </span>
              </li>
              <li>
                <span className="hover:text-teal-400 cursor-pointer transition-colors">
                  Giải pháp quản lý phòng trọ
                </span>
              </li>
            </ul>
          </div>

          {/* Cột 4: Hỗ trợ & Liên hệ */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Tổng đài hỗ trợ</h4>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Headphones className="w-5 h-5 text-teal-400" />
                1900 6868
              </div>
              <p>Thời gian làm việc: 08:00 – 22:00 hàng ngày</p>
              <p>Email: hotro@innfinder.vn</p>
              <p>Địa chỉ: TP. Hồ Chí Minh & Hà Nội, Việt Nam</p>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 InnFinder Platform (TrọTốt). All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Thiết kế dành cho trải nghiệm thuê trọ tốt nhất</span>
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 inline ml-1" />
          </div>
        </div>
      </div>
    </footer>
  );
};
