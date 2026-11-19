import React from 'react';
import { Link } from 'react-router-dom';
import { Headphones, Heart, ShieldCheck } from 'lucide-react';
import { InnFinderLogo } from '@/components/common/InnFinderLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-14 pb-10 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-slate-800">
          <div className="md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <InnFinderLogo variant="pin" size="md" />
              <span className="text-xl font-extrabold tracking-tight text-white">InnFinder</span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nền tảng tìm kiếm phòng trọ, đặt lịch xem phòng có bảo chứng cọc giữ chân và kết nối
              minh bạch giữa Khách thuê và Chủ trọ uy tín.
            </p>
            <div className="flex items-center gap-2 text-xs text-teal-400">
              <ShieldCheck className="w-4 h-4" />
              <span>100% tin đăng qua kiểm duyệt Admin</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-4">Dành cho khách thuê</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/search" className="hover:text-teal-400 transition-colors">
                  Tìm kiếm phòng trọ & Bản đồ
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="hover:text-teal-400 transition-colors">
                  Phòng yêu thích đã lưu
                </Link>
              </li>
              <li>
                <Link to="/appointments" className="hover:text-teal-400 transition-colors">
                  Quản lý lịch hẹn xem phòng
                </Link>
              </li>
              <li>
                <Link to="/complaints" className="hover:text-teal-400 transition-colors">
                  Gửi khiếu nại & Bảo vệ quyền lợi
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-4">Dành cho chủ trọ</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/landlord/rooms/create" className="hover:text-teal-400 transition-colors">
                  Đăng tin cho thuê phòng mới
                </Link>
              </li>
              <li>
                <Link to="/landlord/dashboard" className="hover:text-teal-400 transition-colors">
                  Bảng điều khiển Chủ trọ
                </Link>
              </li>
              <li>
                <Link to="/landlord/appointments" className="hover:text-teal-400 transition-colors">
                  Duyệt lịch xem & Đối soát cọc
                </Link>
              </li>
              <li>
                <Link to="/landlord/wallet" className="hover:text-teal-400 transition-colors">
                  Quản lý ví & Rút tiền ngân hàng
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-4">Tổng đài hỗ trợ</h4>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Headphones className="w-5 h-5 text-teal-400" />
                1900 6868
              </div>
              <p>Thời gian làm việc: 08:00 – 22:00 hàng ngày</p>
              <p>Email: hotro@innfinder.vn</p>
              <p>Địa chỉ: TP. Hồ Chí Minh, Việt Nam</p>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 InnFinder Platform. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Vận hành theo cơ chế bảo vệ cọc xem phòng minh bạch</span>
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 inline ml-1" />
          </div>
        </div>
      </div>
    </footer>
  );
};
