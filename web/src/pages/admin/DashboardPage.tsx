import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  AlertTriangle,
  Wallet,
  Clock,
  TrendingUp,
  ArrowRight,
  Loader2,
  DollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { adminService } from '../../services/admin.service';
import type { AdminDashboardStats, AdminTreasuryStats } from '../../types/admin.types';
import { formatVND } from '../../utils/formatters';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [treasury, setTreasury] = useState<AdminTreasuryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [dashRes, treasRes] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getTreasuryStats(),
      ]);
      setStats(dashRes);
      setTreasury(treasRes);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs">Đang tải số liệu tổng quan & ngân khố sàn...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tổng quan vận hành sàn</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu đối soát tài chính, hàng đợi kiểm duyệt và ngân khố trung tâm theo thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Làm mới số liệu
          </button>
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Người dùng */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Tổng người dùng</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {stats?.nguoiDung.total.toLocaleString('vi-VN')}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+12% so với tháng trước</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Số tin đăng */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Tin đăng phòng trọ</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {stats?.soTinDang.total.toLocaleString('vi-VN')}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>Đang hiển thị công khai</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Doanh thu hoa hồng sàn */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Doanh thu hoa hồng sàn</span>
            <div className="text-2xl font-black text-blue-600 mt-1">
              {stats?.doanhThu.total || '0 ₫'}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Trích từ cọc khi xem phòng thành công
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Khiếu nại chờ xử lý */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Khiếu nại cần giải quyết</span>
            <div
              className={`text-2xl font-black mt-1 ${
                stats?.khieuNai.isAlert ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {stats?.khieuNai.total}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-1">
              {stats?.khieuNai.isAlert ? (
                <span className="text-rose-600 font-bold">Cần xử lý ngay</span>
              ) : (
                'Tất cả đã giải quyết'
              )}
            </div>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              stats?.khieuNai.isAlert
                ? 'bg-rose-50 text-rose-600 animate-pulse'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* CENTRAL TREASURY CARDS */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Wallet className="w-4 h-4" />
              Sổ cái ngân khố trung tâm sàn InnFinder
            </div>
            <h2 className="text-xl font-black text-white mt-1">
              Tổng quỹ hệ thống đang luân chuyển:{' '}
              <span className="text-emerald-400">{formatVND(treasury?.tongQuyHeThong)}</span>
            </h2>
          </div>
          <Link
            to="/admin/transactions"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 self-start sm:self-auto transition-all"
          >
            Quản lý dòng tiền
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] text-slate-300 block mb-1">Quỹ cọc giữ chân tạm giữ</span>
            <div className="text-lg font-bold text-amber-300">
              {formatVND(treasury?.quyTamGiuCoc)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Đang chờ khách đi xem phòng thực tế</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] text-slate-300 block mb-1">Tổng số dư ví các Chủ trọ</span>
            <div className="text-lg font-bold text-emerald-300">
              {formatVND(treasury?.tongSoDuViChuTro)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Khả dụng cho các chủ trọ rút về</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] text-slate-300 block mb-1">Quỹ yêu cầu rút tiền</span>
            <div className="text-lg font-bold text-blue-300">
              {formatVND(treasury?.quyChoRut)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Đang đợi Admin phê duyệt chuyển khoản
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] text-slate-300 block mb-1">Lệnh rút tiền chờ duyệt</span>
            <div className="text-lg font-bold text-rose-300">
              {treasury?.soLenhRutChoDuyet || 0} lệnh
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Cần đối soát tài khoản ngân hàng</p>
          </div>
        </div>
      </div>

      {/* Action Queue & Growth Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Action Queue */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Hàng đợi hành động cần xử lý</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Ưu tiên
              </span>
            </div>

            <div className="space-y-3">
              <Link
                to="/admin/posts"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                    PT
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Tin đăng phòng mới</h4>
                    <p className="text-[11px] text-slate-500">Chờ kiểm duyệt hình ảnh & giá</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-600 text-white">
                  {stats?.hangDoi.tinMoi || 0}
                </span>
              </Link>

              <Link
                to="/admin/users"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    CT
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Xác minh CCCD Chủ trọ</h4>
                    <p className="text-[11px] text-slate-500">Chờ duyệt hồ sơ & số tài khoản</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-600 text-white">
                  {stats?.hangDoi.xacMinhChuTro || 0}
                </span>
              </Link>

              <Link
                to="/admin/complaints"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">
                    KN
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Báo cáo khiếu nại</h4>
                    <p className="text-[11px] text-slate-500">Tranh chấp cọc & vi phạm nội quy</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white">
                  {stats?.hangDoi.baoCaoViPham || 0}
                </span>
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              Kiểm duyệt kịp thời giúp duy trì uy tín hệ thống
            </span>
          </div>
        </div>

        {/* Right Column: Revenue Chart */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tăng trưởng Doanh thu hoa hồng sàn (phiThu)
              </h3>
              <p className="text-xs text-slate-500">
                Doanh thu thực nhận sau khi hoàn tất dẫn xem và ký cọc thành công
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              Năm 2026
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats?.tangTruongGiaoDich || []}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorGiaTri" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="thang" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${val / 1000000}M`}
                />
                <Tooltip
                  formatter={(value: any) => [formatVND(value), 'Doanh thu hoa hồng']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="giaTri"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorGiaTri)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
