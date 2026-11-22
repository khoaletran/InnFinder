import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@heroui/react';
import { Download, Wallet, DollarSign, Building2 } from 'lucide-react';
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
import { AdminErrorState, AdminRefreshButton } from '@/components/common/AdminStates';
import { formatVND } from '@/utils/formatters';

const PIE_COLORS = ['#0d9488', '#0f766e', '#10b981', '#f59e0b', '#64748b', '#06b6d4'];

export const StatisticsPage: React.FC = () => {
  const {
    data: stats,
    isLoading: isLoadingStats,
    isFetching: isFetchingStats,
    isError: isErrorStats,
    error: errorStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: () => adminService.getDashboardStats(),
  });

  const {
    data: treasury,
    isLoading: isLoadingTreasury,
    isFetching: isFetchingTreasury,
    isError: isErrorTreasury,
    error: errorTreasury,
    refetch: refetchTreasury,
  } = useQuery({
    queryKey: ['admin', 'treasury-stats'],
    queryFn: () => adminService.getTreasuryStats(),
  });

  const {
    data: allRooms = [],
    isLoading: isLoadingRooms,
    isError: isErrorRooms,
    refetch: refetchRooms,
  } = useQuery({
    queryKey: ['admin', 'rooms', 'all'],
    queryFn: () => adminService.getAllRooms(),
  });

  const handleRefreshAll = () => {
    void refetchStats();
    void refetchTreasury();
    void refetchRooms();
  };

  // Phân bố loại hình phòng thực tế từ toàn bộ phòng trên sàn
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

  // Biểu đồ đối soát rạch ròi giữa Doanh thu Hoa hồng Sàn và các Quỹ dòng tiền đang luân chuyển
  const treasuryBreakdownData = useMemo(
    () => [
      {
        danhMuc: 'Doanh thu sàn',
        soTien: treasury?.tongDoanhThu ?? 0,
      },
      {
        danhMuc: 'Cọc tạm giữ',
        soTien: treasury?.quyTamGiuCoc ?? 0,
      },
      {
        danhMuc: 'Ví Chủ trọ',
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
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-64 bg-slate-200 rounded-lg" />
            <div className="h-3.5 w-80 bg-slate-200/80 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-slate-200 rounded-xl" />
            <div className="h-9 w-36 bg-slate-200 rounded-xl" />
          </div>
        </div>
        <div className="h-16 bg-slate-200/70 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-28 bg-white rounded-2xl border border-slate-200 p-5" />
          ))}
        </div>
        <div className="h-72 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  if (isErrorStats || isErrorTreasury) {
    const errMsg =
      (errorStats instanceof Error && errorStats.message) ||
      (errorTreasury instanceof Error && errorTreasury.message) ||
      'Không thể tải báo cáo thống kê doanh thu và ngân khố sàn.';
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Thống kê & Báo cáo Doanh thu Sàn
          </h1>
          <AdminRefreshButton onClick={handleRefreshAll} isRefreshing={isFetchingStats || isFetchingTreasury} />
        </div>
        <AdminErrorState
          title="Không thể tải dữ liệu thống kê"
          message={errMsg}
          onRetry={handleRefreshAll}
        />
      </div>
    );
  }

  const isRefreshing = isFetchingStats || isFetchingTreasury;

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Thống kê & Báo cáo Doanh thu Sàn
        </h1>

        <div className="flex items-center gap-2">
          <AdminRefreshButton
            onClick={handleRefreshAll}
            isRefreshing={isRefreshing}
            label="Đồng bộ dữ liệu"
          />
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

      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">
                Tổng doanh thu hoa hồng sàn
              </span>
              <div className="text-2xl font-black text-teal-700 mt-1">
                {formatVND(treasury?.tongDoanhThu ?? 0)}
              </div>
              <span className="text-[11px] text-slate-400">
                Từ các lịch hẹn thuê phòng đã hoàn tất
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </Card.Content>
        </Card>

        <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">
                Quỹ luân chuyển ngân khố
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatVND(treasury?.tongQuyHeThong ?? 0)}
              </div>
              <span className="text-[11px] text-slate-400">
                Tổng két thực tế: {formatVND(treasury?.tongQuyThucTe ?? 0)} (gồm doanh thu sàn)
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
              <div className="text-2xl font-black text-slate-900 mt-1">
                {(stats?.soTinDang.total ?? allRooms.length).toLocaleString('vi-VN')} phòng
              </div>
              <span className="text-[11px] text-slate-400">
                Chờ duyệt: {stats?.hangDoi.tinMoi ?? 0} bài đăng
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Chart 1: Reusable PlatformRevenueChart */}
      <PlatformRevenueChart
        data={stats?.tangTruongGiaoDich || []}
        title="Biểu đồ Tăng trưởng Doanh thu Hoa hồng Sàn"
        subtitle="Tổng hợp theo tháng từ phí hoa hồng các giao dịch thuê phòng đã hoàn tất"
        isLoading={isLoadingStats}
        isError={isErrorStats}
        onRetry={handleRefreshAll}
      />

      {/* Chart 2 & Chart 3: Phân tách Doanh thu vs Dòng tiền Ngân khố & Cơ cấu loại phòng */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <Card.Header className="p-0 pb-4">
            <Card.Title className="text-sm font-bold text-slate-900">
              Phân tách Doanh thu Sàn và Quỹ Ngân khố Luân chuyển
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
                <Bar dataKey="soTien" fill="#0d9488" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        <Card className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <Card.Header className="p-0 pb-4">
              <Card.Title className="text-sm font-bold text-slate-900">
                Cơ cấu loại hình phòng trọ trên sàn
              </Card.Title>
              <Card.Description className="text-xs text-slate-500 mt-0.5">
                Thống kê trực tiếp từ {allRooms.length} bài đăng ghi nhận trên hệ thống
              </Card.Description>
            </Card.Header>

            <Card.Content className="p-0 h-56 w-full flex items-center justify-center">
              {isLoadingRooms ? (
                <div className="w-36 h-36 rounded-full bg-slate-200 animate-pulse" />
              ) : isErrorRooms ? (
                <AdminErrorState
                  compact
                  title="Không thể tải danh sách phòng"
                  onRetry={() => void refetchRooms()}
                />
              ) : roomTypeDistribution.length > 0 ? (
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
                  Chưa có bài đăng phòng trọ nào để phân tích tỷ trọng.
                </div>
              )}
            </Card.Content>
          </div>
        </Card>
      </div>
    </div>
  );
};
