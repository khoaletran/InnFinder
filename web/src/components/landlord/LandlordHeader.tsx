import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Home, ShieldCheck, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { landlordService } from '@/services/landlord.service';
import { useNotificationStore } from '@/store/useNotificationStore';
import { formatVND } from '@/utils/formatters';

interface LandlordHeaderProps {
  title?: string;
  subtitle?: string;
}

export const LandlordHeader: React.FC<LandlordHeaderProps> = ({
  title = 'Tổng quan Chủ trọ',
  subtitle,
}) => {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const { data: walletInfo } = useQuery({
    queryKey: ['landlord', 'wallet'],
    queryFn: landlordService.getWalletInfo,
  });

  const soDu = walletInfo?.soDu ?? 0;
  const diemUyTin = walletInfo?.diemUyTin ?? 100;

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-6 lg:px-8 flex items-center justify-between shadow-2xs">
      <div>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          Về trang tìm phòng
        </Link>

        <button
          type="button"
          onClick={() => navigate('/landlord/wallet')}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl transition-all cursor-pointer"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <span className="block text-[10px] font-semibold text-emerald-700 uppercase leading-none">
              Số dư ví
            </span>
            <span className="text-xs font-bold text-emerald-800">{formatVND(soDu)}</span>
          </div>
        </button>

        <div
          title="Điểm uy tín Chủ trọ"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-amber-800">{diemUyTin} điểm</span>
        </div>

        <Link
          to="/notifications"
          title="Thông báo"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </Link>
      </div>
    </header>
  );
};
