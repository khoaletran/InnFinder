// web/src/components/layout/Navbar.tsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Heart, Search, PlusCircle, LogIn } from "lucide-react";
import { useFavoriteStore } from "../../store/useFavoriteStore";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const favoriteIds = useFavoriteStore((s) => s.favoriteIds);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* 1. Logo TrọTốt / InnFinder */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:bg-teal-700 transition-colors">
            <Home className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-teal-700 transition-colors">
              TrọTốt
            </span>
            <span className="text-[10px] -mt-1 font-semibold text-teal-600 uppercase tracking-wider">
              InnFinder Platform
            </span>
          </div>
        </Link>

        {/* 2. Menu Navigation */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          <Link
            to="/search"
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
              isActive("/search")
                ? "bg-teal-50 text-teal-700 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Search className="w-4 h-4" />
            Tìm phòng
          </Link>

          <button
            type="button"
            onClick={() => navigate("/search")}
            className="px-4 py-2 rounded-full text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Đăng tin
          </button>

          <Link
            to="/favorites"
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 relative ${
              isActive("/favorites")
                ? "bg-teal-50 text-teal-700 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Heart
              className={`w-4 h-4 ${favoriteIds.length > 0 ? "fill-rose-500 text-rose-500" : ""}`}
            />
            Yêu thích
            {favoriteIds.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {favoriteIds.length}
              </span>
            )}
          </Link>
        </nav>

        {/* 3. Auth Actions & Avatar */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => alert("Chức năng đăng nhập tài khoản")}
            className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-teal-700 px-3 py-2 transition-colors items-center gap-1.5"
          >
            <LogIn className="w-4 h-4" />
            Đăng nhập
          </button>

          <button
            type="button"
            onClick={() => alert("Chức năng đăng ký tài khoản")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-full shadow-sm hover:shadow transition-all"
          >
            Đăng ký
          </button>

          {/* Avatar Profile */}
          <Link
            to="/favorites"
            title="Tài khoản khách thuê"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold transition-all"
          >
            NA
          </Link>
        </div>
      </div>
    </header>
  );
};
