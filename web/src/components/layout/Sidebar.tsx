// web/src/components/layout/Sidebar.tsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Heart,
  Calendar,
  FileText,
  CreditCard,
  Bell,
  User,
  AlertCircle,
  Headphones,
  LogOut,
} from "lucide-react";
import { useFavoriteStore } from "../../store/useFavoriteStore";

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const favoriteIds = useFavoriteStore((s) => s.favoriteIds);

  const menuItems = [
    { label: "Trang chủ", path: "/", icon: Home },
    {
      label: "Phòng yêu thích",
      path: "/favorites",
      icon: Heart,
      badge: favoriteIds.length > 0 ? favoriteIds.length : undefined,
    },
    { label: "Lịch xem phòng", path: "/schedule", icon: Calendar },
    { label: "Yêu cầu thuê", path: "/rental-requests", icon: FileText },
    { label: "Giao dịch", path: "/transactions", icon: CreditCard },
    { label: "Thông báo", path: "/notifications", icon: Bell },
    { label: "Thông tin cá nhân", path: "/profile", icon: User },
    { label: "Khiếu nại", path: "/complaints", icon: AlertCircle },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      {/* Top Header & Navigation */}
      <div className="p-5 overflow-y-auto">
        {/* Logo TrọTốt */}
        <Link to="/" className="flex items-center gap-2.5 mb-8 group">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:bg-teal-700 transition-colors">
            <Home className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-teal-700 transition-colors">
            TrọTốt
          </span>
        </Link>

        {/* Category Label */}
        <div className="mb-2 px-3 text-[11px] font-bold text-teal-600 uppercase tracking-wider">
          Khách thuê
        </div>

        {/* Menu list */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? "bg-teal-50 text-teal-800 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      active
                        ? "text-teal-700 stroke-[2.5]"
                        : "text-slate-500 stroke-[1.8]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Help & User Profile */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        {/* Help Banner */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-0.5">
            <Headphones className="w-3.5 h-3.5 text-teal-600" />
            Cần hỗ trợ?
          </div>
          <p className="text-[11px] text-slate-500">
            Hotline <span className="font-semibold text-slate-700">1900 6868</span> · 08:00-22:00
          </p>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold shrink-0">
              NA
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                Nguyễn Minh Anh
              </p>
              <p className="text-[10px] text-slate-400 truncate">Khách hàng</p>
            </div>
          </div>

          <button
            type="button"
            title="Đăng xuất"
            onClick={() => {
              if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
                localStorage.removeItem("accessToken");
                navigate("/");
              }
            }}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
