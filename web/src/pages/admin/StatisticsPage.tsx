import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Chip, Spinner } from '@heroui/react';
import { Download, RefreshCw, ShieldCheck, Wallet, DollarSign, Building2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { adminService } from '@/services/admin.service';
import { PlatformRevenueChart } from '@/components/charts/PlatformRevenueChart';
import { formatVND } from '@/utils/formatters';

const PIE_COLORS = ['#2563eb', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

export const StatisticsPage: React.FC = () => {
  const {
    data: stats,
    isLoading: isLoadingStats,
    isFetching: isFetchingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: () => adminService.getDashboardStats(),
  });

  const {
    data: treasury,
    isLoading: isLoadingTreasury,
    isFetching: isFetchingTreasury,
    refetch: refetchTreasury,
  } = useQuery({
    queryKey: ['admin', 'treasury-stats'],
    queryFn: () => adminService.getTreasuryStats(),
  });

  const { data: allRooms = [], refetch: refetchRooms } = useQuery({
    queryKey: ['admin', 'rooms', 'all'],
    queryFn: () => adminService.getAllRooms(),
  });

  const handleRefreshAll = () => {
    void refetchStats();
    void refetchTreasury();
    void refetchRooms();
  };

  // Phân bố loại hình phòng thực tế từ danh sách phòng đã tải trên sàn
  const roomTypeDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const room of allRooms) {
      const label = room.loaiPhong || 'Phòng trọ tiêu chuẩn';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value], idx) => ({
      name,
      value,
      color: PIE_COLORS[idx % PIE_COLORS.length],
    }));
  }, [allRooms]);

  // Biểu đồ đối soát rạch ròi giữa Doanh thu Hoa hồng Sàn (phiThu HOAN_THANH) và các Quỹ dòng tiền đối soát
  const treasuryBreakdownData = useMemo(
    () => [
      {
        danhMuc: 'Doanh thu Sàn (phiThu)',
        soTien: treasury?.tongDoanhThu ?? 0,
      },
      {
        danhMuc: 'Cọc tạm giữ',
        soTien: treasury?.quyTamGiuCoc ?? 0,
      },
      {
        danhMuc: 'Số dư ví Chủ trọ',
        soTien: treasury?.tongSoDuViChuTro ?? 0,
      },
      {
        danhMuc: 'Quỹ chờ rút',
        soTien: treasury?.quyChoRut ?? 0,
      },
    ],
    [treasury],
  );

  if (isLoadingStats || isLoadingTreasury) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <Spinner size="lg" />
        <span className="text-xs font-medium">
          Đang tải báo cáo thống kê doanh thu sàn & ngân khố thực tế...
        </span>
      </div>
    );
  }

  const isRefreshing = isFetchingStats || isFetchingTreasury;

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Thống kê & Báo cáo Doanh thu Sàn
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Đối soát doanh thu hoa hồng môi giới thực tế (`phiThu` từ `PhieuDatLich` hoàn tất) và cơ cấu ngân khố
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            Đồng bộ dữ liệu
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất báo cáo tài chính
          </button>
        </div>
      </div>

      {/* Platform Revenue Strict Compliance Notice */}
      <Card className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 shadow-none">
        <Card.Content className="p-0 flex items-start gap-3 text-xs text-slate-800">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900">
                Chuẩn mực Kế toán Doanh thu Sàn InnFinder (AGENTS.md §2.3 & §5.5):
              </span>
              <Chip size="sm" variant="soft" color="success" className="font-bold">
                Dữ liệu API thời gian thực
              </Chip>
            </div>
            <p className="leading-relaxed text-slate-700">
              Doanh thu của hệ thống được tính <strong>độc quyền</strong> theo công thức{' '}
              <code className="px-1.5 py-0.5 rounded bg-white border border-emerald-200 font-mono text-[11px] text-emerald-800">
                SELECT COALESCE(SUM(p.phi_thu), 0) FROM phieu_dat_lich p WHERE p.trang_thai = 'HOAN_THANH'
              </code>
              . Bảng <code className="font-mono">GiaoDich</code> chỉ đóng vai trò sổ cái dòng tiền đối soát cọc/hoàn cọc/rút tiền và <strong>tuyệt đối không được cộng vào doanh thu sàn</strong>.
            </p>
          </div>
        </Card.Content>
      </Card>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">
                Tổng doanh thu hoa hồng sàn (`SUM(phiThu)`)
              </span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {formatVND(treasury?.tongDoanhThu ?? 0)}
              </div>
              <span className="text-[11px] text-slate-400">
                Từ các lịch hẹn đạt trạng thái HOAN_THANH
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </Card.Content>
        </Card>

        <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">
                Tổng quỹ luân chuyển ngân khố
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatVND(treasury?.tongQuyHeThong ?? 0)}
              </div>
              <span className="text-[11px] text-slate-400">
                Đối soát sổ cái tạm giữ cọc & ví Chủ trọ
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </Card.Content>
        </Card>

        <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">
                Tổng phòng trọ ghi nhận
              </span>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                {(stats?.soTinDang.total ?? allRooms.length).toLocaleString('vi-VN')} phòng
              </div>
              <span className="text-[11px] text-slate-400">
                Chờ duyệt: {stats?.hangDoi.tinMoi ?? 0} bài đăng
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Chart 1: Reusable PlatformRevenueChart */}
      <PlatformRevenueChart
        data={stats?.tangTruongGiaoDich || []}
        title="Biểu đồ Tăng trưởng Doanh thu Hoa hồng Sàn (`phiThu`)"
        subtitle="Tính độc quyền từ SUM(phiThu) của các PhieuDatLich đạt trạng thái HOAN_THANH theo thời gian thực"
      />

      {/* Chart 2 & Chart 3: Phân tách Doanh thu vs Dòng tiền Ngân khố & Cơ cấu loại phòng */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <Card.Header className="p-0 pb-4">
            <Card.Title className="text-sm font-bold text-slate-900">
              Phân tách Doanh thu Sàn (`phiThu`) và Quỹ Ngân khố Luân chuyển
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-0.5">
              Tách biệt rõ hoa hồng thực thu của sàn với tiền cọc tạm giữ và số dư ví thuộc sở hữu Chủ trọ
            </Card.Description>
          </Card.Header>

          <Card.Content className="p-0 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={treasuryBreakdownData}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="danhMuc" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val: number) =>
                    val >= 1_000_000
                      ? `${(val / 1_000_000).toFixed(1)}M`
                      : `${val.toLocaleString('vi-VN')}`
                  }
                />
                <Tooltip
                  formatter={(val: unknown) => [formatVND(Number(val ?? 0)), 'Giá trị thực tế']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="soTien" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        <Card className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <Card.Header className="p-0 pb-4">
              <Card.Title className="text-sm font-bold text-slate-900">
                Cơ cấu loại hình phòng trọ đang hiển thị
              </Card.Title>
              <Card.Description className="text-xs text-slate-500 mt-0.5">
                Thống kê trực tiếp từ {allRooms.length} bài đăng công khai trên sàn
              </Card.Description>
            </Card.Header>

            <Card.Content className="p-0 h-56 w-full flex items-center justify-center">
              {roomTypeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roomTypeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {roomTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [`${Number(val ?? 0)} phòng`, 'Số lượng']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-xs text-slate-400">
                  Chưa có bài đăng phòng trọ công khai để phân tích tỷ trọng.
                </div>
              )}
            </Card.Content>
          </div>

          <Card.Footer className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 border border-slate-100 mt-3">
            Sàn InnFinder không quản lý tiền thuê phòng (`giaThue`) hay tiền cọc hợp đồng (`cocPhong`) giữa Khách và Chủ trọ.
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
};
