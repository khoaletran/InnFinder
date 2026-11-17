import React, { useState } from 'react';
import {
  Eye,
  Clock,
  MapPin,
} from 'lucide-react';
import { formatVND } from '../../utils/formatters';

interface MockAppointment {
  maDatLich: string;
  tenKhachHang: string;
  sdtKhachHang: string;
  tenChuTro: string;
  sdtChuTro: string;
  tenPhongTro: string;
  diaChiPhong: string;
  ngayHen: string;
  tienCoc: number;
  phiThu: number;
  trangThai: 'CHO_XAC_NHAN' | 'XAC_NHAN' | 'HOAN_THANH' | 'HUY';
  ghiChu?: string;
}

const MOCK_APPOINTMENTS: MockAppointment[] = [
  {
    maDatLich: 'LV-260926-01',
    tenKhachHang: 'Nguyễn Văn Minh',
    sdtKhachHang: '0912345678',
    tenChuTro: 'Trần Đức Minh',
    sdtChuTro: '0988776655',
    tenPhongTro: 'Studio có ban công, nội thất mới',
    diaChiPhong: '12/4 Đường số 8, Phường Linh Trung, Thủ Đức, TP.HCM',
    ngayHen: '2026-11-18 09:30',
    tienCoc: 200000,
    phiThu: 20000,
    trangThai: 'XAC_NHAN',
    ghiChu: 'Khách yêu cầu xem buổi sáng',
  },
  {
    maDatLich: 'LV-260926-02',
    tenKhachHang: 'Lê Hoàng Yến',
    sdtKhachHang: '0933221100',
    tenChuTro: 'Phạm Thị Lan',
    sdtChuTro: '0909123456',
    tenPhongTro: 'Phòng trọ gác lửng cao cấp',
    diaChiPhong: '45 Lê Văn Việt, Phường Tăng Nhơn Phú A, TP.HCM',
    ngayHen: '2026-11-17 15:00',
    tienCoc: 200000,
    phiThu: 20000,
    trangThai: 'HOAN_THANH',
    ghiChu: 'Đã hoàn tất dẫn xem và ký thuê thành công',
  },
  {
    maDatLich: 'LV-260926-03',
    tenKhachHang: 'Hoàng Minh Tuấn',
    sdtKhachHang: '0977889900',
    tenChuTro: 'Trần Đức Minh',
    sdtChuTro: '0988776655',
    tenPhongTro: 'Chung cư mini full nội thất',
    diaChiPhong: '88 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM',
    ngayHen: '2026-11-16 14:00',
    tienCoc: 300000,
    phiThu: 30000,
    trangThai: 'HUY',
    ghiChu: 'Khách không đến điểm hẹn, đã hoàn cọc cho chủ trọ',
  },
];

export const ViewingsPage: React.FC = () => {
  const [appointments] = useState<MockAppointment[]>(MOCK_APPOINTMENTS);
  const [selectedViewing, setSelectedViewing] = useState<MockAppointment | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = appointments.filter((a) => {
    if (statusFilter !== 'ALL' && a.trangThai !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: MockAppointment['trangThai']) => {
    switch (status) {
      case 'CHO_XAC_NHAN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ xác nhận
          </span>
        );
      case 'XAC_NHAN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Đã xác nhận hẹn
          </span>
        );
      case 'HOAN_THANH':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Hoàn tất xem
          </span>
        );
      case 'HUY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            Đã hủy
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý Lịch xem & Cọc giữ chân</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Giám sát quy trình hẹn gặp, bảo vệ cọc giữ chân và thu phí hoa hồng sàn (phiThu)
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'ALL', label: 'Tất cả lịch xem' },
          { key: 'CHO_XAC_NHAN', label: 'Chờ chủ xác nhận' },
          { key: 'XAC_NHAN', label: 'Sắp diễn ra' },
          { key: 'HOAN_THANH', label: 'Đã hoàn tất' },
          { key: 'HUY', label: 'Đã hủy' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === tab.key
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Mã lịch hẹn</th>
                <th className="py-3 px-4">Phòng trọ</th>
                <th className="py-3 px-4">Khách thuê</th>
                <th className="py-3 px-4">Chủ trọ</th>
                <th className="py-3 px-4">Thời gian hẹn</th>
                <th className="py-3 px-4">Cọc giữ chân</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.maDatLich} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{item.maDatLich}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs truncate">
                    {item.tenPhongTro}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{item.tenKhachHang}</div>
                    <div className="text-[10px] text-slate-400">{item.sdtKhachHang}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{item.tenChuTro}</div>
                    <div className="text-[10px] text-slate-400">{item.sdtChuTro}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{item.ngayHen}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900">{formatVND(item.tienCoc)}</span>
                    <span className="block text-[10px] text-blue-600">Hoa hồng: {formatVND(item.phiThu)}</span>
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(item.trangThai)}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedViewing(item)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CHI TIẾT LỊCH XEM (FRAME 3) */}
      {selectedViewing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Phiếu lịch hẹn #{selectedViewing.maDatLich}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedViewing.tenPhongTro}</h3>
              </div>
              <button
                onClick={() => setSelectedViewing(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                <span>{selectedViewing.diaChiPhong}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Thời gian xem: <strong>{selectedViewing.ngayHen}</strong></span>
              </div>
            </div>

            {/* Khách & Chủ */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <span className="text-[10px] text-blue-600 font-bold block mb-1">Khách thuê hẹn xem</span>
                <div className="font-bold text-slate-900">{selectedViewing.tenKhachHang}</div>
                <div className="text-slate-500">{selectedViewing.sdtKhachHang}</div>
              </div>

              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <span className="text-[10px] text-indigo-600 font-bold block mb-1">Chủ trọ dẫn xem</span>
                <div className="font-bold text-slate-900">{selectedViewing.tenChuTro}</div>
                <div className="text-slate-500">{selectedViewing.sdtChuTro}</div>
              </div>
            </div>

            {/* Tài chính cọc */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-emerald-950">
                <span>Tiền cọc giữ chân tạm giữ trên sàn:</span>
                <span>{formatVND(selectedViewing.tienCoc)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 text-[11px]">
                <span>Phí hoa hồng trích thu khi thuê thành công:</span>
                <span>{formatVND(selectedViewing.phiThu)}</span>
              </div>
              <p className="text-[10px] text-emerald-700 pt-1 border-t border-emerald-200/60 leading-relaxed">
                Quy trình: Chủ trọ trực tiếp trả 100% cọc cho khách tại buổi gặp. Sàn hoàn cọc cho chủ trọ vào ví và trích thu phí hoa hồng nếu cả 2 bên xác nhận thuê.
              </p>
            </div>

            <button
              onClick={() => setSelectedViewing(null)}
              className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
