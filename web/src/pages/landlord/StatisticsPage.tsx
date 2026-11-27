import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Camera,
  Eye,
  Heart,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LandlordQueryError } from '@/components/landlord/LandlordQueryError';
import { landlordService } from '@/services/landlord.service';
import type { LandlordRoomHealth } from '@/types/landlord.types';
import { formatVND } from '@/utils/formatters';

const HEALTH_BADGES: Record<LandlordRoomHealth, { label: string; className: string }> = {
  HUT_KHACH: { label: 'Hút khách', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  XEM_NHIEU_IT_COC: { label: 'Xem nhiều · Ít cọc', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  CTR_THAP: { label: 'CTR thấp', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  DA_THUE: { label: 'Đã cho thuê', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  CHO_DUYET: { label: 'Chờ duyệt', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  ON_DINH: { label: 'Ổn định', className: 'bg-teal-50 text-teal-700 border-teal-200' },
};

const PRIORITY_BADGES: Record<'CAO' | 'TRUNG_BINH' | 'GOI_Y', { label: string; className: string }> = {
  CAO: { label: 'Ưu tiên cao', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  TRUNG_BINH: { label: 'Nên tối ưu', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  GOI_Y: { label: 'Gợi ý', className: 'bg-teal-50 text-teal-700 border-teal-200' },
};

export const StatisticsPage: React.FC = () => {
  const [months, setMonths] = useState<number>(6);
  const [healthFilter, setHealthFilter] = useState<string>('ALL');

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['landlord', 'analytics', months],
    queryFn: () => landlordService.getAnalytics(months),
    placeholderData: (prev) => prev,
  });

  const filteredRooms = useMemo(() => {
    const list = data?.hieuQuaTungPhong ?? [];
    if (healthFilter === 'ALL') return list;
    return list.filter((r) => r.nhanSucKhoe === healthFilter);
  }, [data?.hieuQuaTungPhong, healthFilter]);

  const funnelSteps = useMemo(() => {
    const f = data?.pheuKhachHang;
    if (!f) return [];
    return [
      { label: 'Hiển thị gợi ý', count: f.luotHienThi },
      { label: 'Click từ gợi ý', count: f.luotClick },
      { label: 'Xem chi tiết phòng', count: f.luotXem },
      { label: 'Xem Tour 360°', count: f.luotXemTour360 },
      { label: 'Lưu yêu thích', count: f.luotYeuThich },
      { label: 'Đặt lịch xem', count: f.lichDatXem },
      { label: 'Chốt thuê thành công', count: f.chotThue },
    ];
  }, [data?.pheuKhachHang]);

  const funnelMax = useMemo(
    () => Math.max(1, ...funnelSteps.map((s) => s.count)),
    [funnelSteps],
  );

  if (error) {
    return <LandlordQueryError error={error} onRetry={() => void refetch()} />;
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-12 rounded-2xl bg-slate-200/70" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-slate-200" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-white border border-slate-200" />
      </div>
    );
  }

  const summary = data?.tongQuan;

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-900">Thống kê Hiệu quả & Tối ưu Phòng trọ</h1>
          <p className="text-xs text-slate-500">
            Theo dõi dòng tiền thế chân, phễu thu hút khách và gợi ý tăng tỷ lệ chốt thuê
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  months === m
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m} tháng
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Làm mới thống kê"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-5 rounded-2xl bg-white border border-teal-200/80 shadow-xs">
          <Card.Content className="p-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Tiền thế chân thực nhận</span>
              <Wallet className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-teal-700 tabular-nums">
              {formatVND(summary?.tongTienCocThucNhan ?? 0)}
            </div>
            <p className="text-[11px] text-slate-500">
              Số dư ví: <strong className="text-slate-700">{formatVND(summary?.soDuHienTai ?? 0)}</strong> · Bồi thường:{' '}
              {formatVND(summary?.tongBoiThuongNoShow ?? 0)}
            </p>
          </Card.Content>
        </Card>

        <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Hoa hồng trích sàn</span>
              <TrendingUp className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {formatVND(summary?.tongPhiHoaHongDaTra ?? 0)}
            </div>
            <p className="text-[11px] text-slate-500">
              Từ {summary?.lichHoanThanh ?? 0} giao dịch thuê phòng thành công
            </p>
          </Card.Content>
        </Card>

        <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Tỷ lệ chốt lịch xem</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                {summary?.tongLichHen ?? 0} lịch hẹn
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {(summary?.tyLeChotPercent ?? 0).toFixed(1)}%
            </div>
            <p className="text-[11px] text-slate-500">
              Chờ duyệt: {summary?.lichChoDuyet ?? 0} · Đã xem: {summary?.lichDaXem ?? 0} · Hủy: {summary?.lichHuy ?? 0}
            </p>
          </Card.Content>
        </Card>

        <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Lượt xem & CTR gợi ý</span>
              <Eye className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">
              {(summary?.tongLuotXemPhong ?? 0).toLocaleString('vi-VN')}{' '}
              <span className="text-sm font-semibold text-slate-400">lượt xem</span>
            </div>
            <p className="text-[11px] text-slate-500">
              CTR gợi ý: <strong className="text-teal-700">{(summary?.ctrPercent ?? 0).toFixed(1)}%</strong> · Tour 360°:{' '}
              {summary?.tongLuotXemTour360 ?? 0} · Yêu thích: {summary?.tongYeuThich ?? 0}
            </p>
          </Card.Content>
        </Card>
      </div>

      {/* Charts Row: Cashflow + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <Card.Header className="p-0 pb-4">
            <Card.Title className="text-sm font-bold text-slate-900">
              Dòng tiền Thế chân thực nhận & Phí hoa hồng ({months} tháng)
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-0.5">
              Tiền nhận về ví sàn (hoàn cọc/thế chân/bồi thường) so với phí hoa hồng đã khấu trừ
            </Card.Description>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="w-full h-[270px]">
              <ResponsiveContainer width="100%" height={270} minWidth={0}>
                <ComposedChart
                  data={data?.bieuDoDongTien ?? []}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="thang" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val: number) =>
                      val >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}M` : `${val.toLocaleString('vi-VN')}`
                    }
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    allowDecimals={false}
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: unknown, name: unknown) => {
                      const label = String(name ?? '');
                      if (label === 'Lịch chốt thuê') return [`${Number(val ?? 0)} lịch`, label];
                      return [formatVND(Number(val ?? 0)), label];
                    }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    yAxisId="left"
                    dataKey="tienThucNhan"
                    name="Tiền thực nhận về ví"
                    fill="#0d9488"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="phiHoaHong"
                    name="Phí hoa hồng sàn"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="soLichHoanThanh"
                    name="Lịch chốt thuê"
                    stroke="#0284c7"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card.Content>
        </Card>

        <Card className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <Card.Header className="p-0 pb-4">
            <Card.Title className="text-sm font-bold text-slate-900">
              Phễu Thu hút Khách hàng của Bạn
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-0.5">
              Theo dõi điểm rơi từ lúc hiển thị đến khi chốt cho thuê
            </Card.Description>
          </Card.Header>
          <Card.Content className="p-0 space-y-3">
            {funnelSteps.map((step, idx) => {
              const widthPct = step.count === 0 ? 0 : Math.max(8, Math.round((step.count * 100) / funnelMax));
              return (
                <div key={step.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      {idx + 1}. {step.label}
                    </span>
                    <span className="font-black text-slate-900 tabular-nums">
                      {step.count.toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-600 to-cyan-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </Card.Content>
        </Card>
      </div>

      {/* Actionable Recommendations */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <Card.Header className="p-0 pb-4 flex flex-row items-center justify-between gap-2">
          <div>
            <Card.Title className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>Đề xuất Hành động Tối ưu cho Chủ trọ</span>
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-0.5">
              Hệ thống tự động phát hiện cơ hội tăng lượt xem, đặt lịch và tỷ lệ chốt từ dữ liệu thực tế
            </Card.Description>
          </div>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {(data?.deXuatCaiThien ?? []).map((rec) => {
              const pStyle = PRIORITY_BADGES[rec.mucDoUuTien] ?? PRIORITY_BADGES.GOI_Y;
              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-slate-900 leading-snug">{rec.tieuDe}</h3>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${pStyle.className}`}
                      >
                        {pStyle.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rec.moTa}</p>
                  </div>
                  <div className="flex justify-end">
                    <Link
                      to={rec.duongDan}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800"
                    >
                      <span>{rec.hanhDongLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Card.Content>
      </Card>

      {/* Room-by-Room Performance Table */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <Card.Header className="p-0 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Card.Title className="text-sm font-bold text-slate-900">
              Chẩn đoán Hiệu quả Từng Phòng Trọ
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-0.5">
              So sánh giá với mặt bằng cùng loại phòng và đo phễu từng bài đăng
            </Card.Description>
          </div>
          <select
            aria-label="Lọc theo sức khỏe phòng"
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái ({data?.hieuQuaTungPhong.length ?? 0})</option>
            <option value="HUT_KHACH">Hút khách</option>
            <option value="XEM_NHIEU_IT_COC">Xem nhiều · Ít cọc</option>
            <option value="CTR_THAP">CTR thấp</option>
            <option value="ON_DINH">Ổn định</option>
            <option value="DA_THUE">Đã cho thuê</option>
            <option value="CHO_DUYET">Chờ duyệt</option>
          </select>
        </Card.Header>

        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] text-slate-500 border-y border-slate-100">
                <tr>
                  <th className="py-3 px-3 font-semibold">Phòng trọ</th>
                  <th className="py-3 px-2 text-right font-semibold">Giá vs Mặt bằng</th>
                  <th className="py-3 px-2 text-center font-semibold">Tour 360°</th>
                  <th className="py-3 px-2 text-right font-semibold">Xem / 360°</th>
                  <th className="py-3 px-2 text-right font-semibold">CTR gợi ý</th>
                  <th className="py-3 px-2 text-right font-semibold">Yêu thích</th>
                  <th className="py-3 px-2 text-right font-semibold">Lịch / Chốt</th>
                  <th className="py-3 px-2 text-right font-semibold">Đánh giá</th>
                  <th className="py-3 px-2 font-semibold">Chẩn đoán</th>
                  <th className="py-3 px-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400">
                      Không có phòng phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((r) => {
                    const hBadge = HEALTH_BADGES[r.nhanSucKhoe] ?? HEALTH_BADGES.ON_DINH;
                    return (
                      <tr key={r.maPhongTro} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 min-w-[200px]">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                r.hinhAnhUrl ||
                                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=120'
                              }
                              alt={r.tenPhong}
                              className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate max-w-[180px]">
                                {r.tenPhong}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                #{r.maPhongTro} · {r.tenLoaiPhong}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums whitespace-nowrap">
                          <div className="font-bold text-slate-900">{formatVND(r.giaThue)}</div>
                          {r.giaTrungBinhCungLoai > 0 && (
                            <div
                              className={`text-[10px] font-semibold ${
                                r.chenhLechGiaPercent > 15
                                  ? 'text-rose-600'
                                  : r.chenhLechGiaPercent < -10
                                    ? 'text-emerald-600'
                                    : 'text-slate-400'
                              }`}
                            >
                              {r.chenhLechGiaPercent > 0 ? '+' : ''}
                              {r.chenhLechGiaPercent}% vs TB
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {r.coTour360 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold">
                              <Camera className="w-3 h-3" /> Có
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Chưa có</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums text-slate-700">
                          {r.luotXem} / {r.luotXemTour360}
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums text-slate-700">
                          {r.ctrPercent.toFixed(1)}%
                          <span className="block text-[10px] text-slate-400">
                            {r.luotClick}/{r.luotHienThi}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums text-slate-700">
                          <span className="inline-flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-500" />
                            {r.luotYeuThich}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums text-slate-700">
                          {r.soLichHen} / <strong className="text-slate-900">{r.soLichHoanThanh}</strong>
                          <span className="block text-[10px] text-slate-400">
                            Chốt {r.tyLeChotPercent.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums">
                          {r.soDanhGia > 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {r.diemDanhGiaTrungBinh.toFixed(1)} ({r.soDanhGia})
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${hBadge.className}`}
                          >
                            {hBadge.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Link
                            to={`/landlord/rooms/edit/${r.maPhongTro}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 font-bold text-[11px] transition-colors"
                          >
                            Tối ưu
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};
