import React, { useState } from 'react';
import { Bell, Wallet, ShieldCheck, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Tổng quan hệ thống', subtitle }) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: 1,
      title: 'Lịch hẹn mới chờ xác nhận',
      desc: 'Khách Nguyễn Văn An đặt lịch xem Phòng Studio vào 09:30 18/11',
      time: '5 phút trước',
      unread: true,
      type: 'appointment',
    },
    {
      id: 2,
      title: 'Giao dịch thành công',
      desc: 'Đã nhận 180.000 VNĐ cọc thế chân từ hợp đồng thuê DL03',
      time: '1 giờ trước',
      unread: false,
      type: 'wallet',
    },
    {
      id: 3,
      title: 'Đánh giá 5 sao mới',
      desc: 'Khách Lê Hoàng Nam vừa đánh giá phòng trọ của bạn',
      time: '3 giờ trước',
      unread: false,
      type: 'review',
    },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-8 flex items-center justify-between shadow-xs">
      {/* Title & Path */}
      <div>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Search bar */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm phòng, khách hẹn..."
            className="w-64 pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-100 border-none focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Wallet pill */}
        <button
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
            <span className="text-xs font-bold text-emerald-800">3.860.000 đ</span>
          </div>
        </button>

        {/* Reputation Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-amber-800">98 đ</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Thông báo mới
                </span>
                <span className="text-[11px] text-cyan-600 font-semibold cursor-pointer hover:underline">
                  Đánh dấu đã đọc
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                      n.unread ? 'bg-cyan-50/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {n.type === 'appointment' ? (
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-slate-800">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{n.desc}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
