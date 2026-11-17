import React from 'react';
import {
  Download,
} from 'lucide-react';
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
import { formatVND } from '../../utils/formatters';

const MONTHLY_DATA = [
  { thang: 'Tháng 5', hoaHong: 12500000, hoanCoc: 18000000 },
  { thang: 'Tháng 6', hoaHong: 18200000, hoanCoc: 24000000 },
  { thang: 'Tháng 7', hoaHong: 24800000, hoanCoc: 35000000 },
  { thang: 'Tháng 8', hoaHong: 31000000, hoanCoc: 41000000 },
  { thang: 'Tháng 9', hoaHong: 29500000, hoanCoc: 39000000 },
  { thang: 'Tháng 10', hoaHong: 42000000, hoanCoc: 54000000 },
  { thang: 'Tháng 11', hoaHong: 48500000, hoanCoc: 62000000 },
];

const ROOM_TYPE_DISTRIBUTION = [
  { name: 'Phòng trọ thường', value: 45, color: '#3b82f6' },
  { name: 'Chung cư mini', value: 25, color: '#6366f1' },
  { name: 'Căn hộ dịch vụ', value: 15, color: '#10b981' },
  { name: 'Nhà nguyên căn', value: 10, color: '#f59e0b' },
  { name: 'Ở ghép / Dorm', value: 5, color: '#ec4899' },
];

export const StatisticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Thống kê & Báo cáo Chuyên sâu</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Báo cáo hiệu quả kinh doanh hoa hồng môi giới và phân bổ phòng trọ toàn hệ thống
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Xuất báo cáo tài chính
        </button>
      </div>

      {/* Chart 1: Doanh thu hoa hồng vs Tổng tiền hoàn cọc */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Đối soát Doanh thu hoa hồng (`phiThu`) và Cọc hoàn trả theo tháng
            </h3>
            <p className="text-xs text-slate-500">
              Hoa hồng thực thu của sàn so với dòng tiền luân chuyển cọc trả lại cho chủ trọ
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="thang" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `${val / 1000000}M`}
              />
              <Tooltip
                formatter={(val: any) => [formatVND(val), '']}
                contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="hoaHong" name="Doanh thu hoa hồng sàn (phiThu)" fill="#2563eb" radius={[6, 6, 0, 0]} />
              <Bar dataKey="hoanCoc" name="Tiền cọc luân chuyển hoàn trả" fill="#93c5fd" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Phân bổ Loại phòng */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Cơ cấu loại hình phòng trọ trên sàn</h3>
          <p className="text-xs text-slate-500 mb-4">Tỷ trọng các bài đăng đang hoạt động</p>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ROOM_TYPE_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {ROOM_TYPE_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`${val}%`, 'Tỷ trọng']} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Chỉ số chuyển đổi xem phòng</h3>
            <p className="text-xs text-slate-500 mb-4">Tỷ lệ hoàn tất ký thuê từ các lịch hẹn xem thực tế</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Tỷ lệ xem phòng thành công và ký hợp đồng</span>
                  <span className="text-emerald-600 font-bold">78.5%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '78.5%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Tỷ lệ xem phòng không thuê (Hoàn cọc 100%)</span>
                  <span className="text-blue-600 font-bold">17.2%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '17.2%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Tỷ lệ hủy lịch hẹn trước giờ xem</span>
                  <span className="text-amber-600 font-bold">4.3%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '4.3%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 border border-slate-100 mt-4">
            Quy trình thế chân cọc đảm bảo tỷ lệ khách đến xem phòng thực tế đạt trên 95%, giải quyết triệt để tình trạng bỏ bom lịch hẹn.
          </div>
        </div>
      </div>
    </div>
  );
};
