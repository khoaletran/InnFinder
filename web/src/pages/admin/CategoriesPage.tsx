import React, { useState, useEffect } from 'react';
import { Coins, Edit3 } from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { RoomTypeDepositFee } from '../../types/admin.types';
import { formatVND } from '../../utils/formatters';
import { toast } from 'sonner';

const DEFAULT_ROOM_TYPES: RoomTypeDepositFee[] = [
  {
    maLoaiPhong: 'PHONG_TRO',
    tenLoaiPhong: 'Phòng trọ truyền thống',
    soTienCoc: 200000,
    phiThu: 20000,
    moTa: 'Phòng đơn hoặc dãy trọ sinh viên, công nhân',
  },
  {
    maLoaiPhong: 'CHUNG_CU_MINI',
    tenLoaiPhong: 'Chung cư mini',
    soTienCoc: 300000,
    phiThu: 30000,
    moTa: 'Căn hộ khép kín, có thang máy, bảo vệ 24/7',
  },
  {
    maLoaiPhong: 'CAN_HO_DICH_VU',
    tenLoaiPhong: 'Căn hộ dịch vụ',
    soTienCoc: 500000,
    phiThu: 50000,
    moTa: 'Full nội thất cao cấp, dịch vụ dọn phòng định kỳ',
  },
  {
    maLoaiPhong: 'NHA_NGUYEN_CAN',
    tenLoaiPhong: 'Nhà nguyên căn',
    soTienCoc: 500000,
    phiThu: 50000,
    moTa: 'Nhà riêng nhiều tầng, phù hợp nhóm bạn hoặc gia đình',
  },
  {
    maLoaiPhong: 'O_GHEP_DORM',
    tenLoaiPhong: 'Ở ghép / Ký túc xá Sleepbox',
    soTienCoc: 100000,
    phiThu: 10000,
    moTa: 'Giường tầng hoặc box riêng tư tối ưu chi phí',
  },
];

export const CategoriesPage: React.FC = () => {
  const [fees, setFees] = useState<RoomTypeDepositFee[]>(DEFAULT_ROOM_TYPES);
  const [editingItem, setEditingItem] = useState<RoomTypeDepositFee | null>(null);
  const [editCoc, setEditCoc] = useState<number>(0);
  const [editPhi, setEditPhi] = useState<number>(0);

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    try {
      const res = await adminService.getRoomTypeDepositFees();
      if (Array.isArray(res) && res.length > 0) {
        setFees(res);
      }
    } catch {
      // Dùng fallback
    }
  };

  const handleStartEdit = (item: RoomTypeDepositFee) => {
    setEditingItem(item);
    setEditCoc(item.soTienCoc);
    setEditPhi(item.phiThu);
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await adminService.updateDepositFee(editingItem.maLoaiPhong, {
        soTienCoc: editCoc,
        phiThu: editPhi,
      });
      toast.success(`Cập nhật biểu phí cọc cho loại phòng ${editingItem.tenLoaiPhong} thành công!`);
      setEditingItem(null);
      loadFees();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật biểu phí');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Cấu hình Biểu phí Cọc & Hoa hồng Sàn
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Quy định mức tiền cọc giữ chân (`soTienCoc`) và hoa hồng thu sàn (`phiThu`) linh hoạt theo từng loại phòng
        </p>
      </div>

      {/* Policy Info Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-xs text-blue-900 space-y-1">
        <div className="flex items-center gap-2 font-bold text-blue-950">
          <Coins className="w-4 h-4 text-blue-600" />
          Quy chế tài chính cốt lõi (Bất khả xâm phạm theo AGENTS.md):
        </div>
        <p className="leading-relaxed">
          1. <strong>Tiền cọc giữ chân xem phòng (`soTienCoc`)</strong>: Khách nộp cho sàn tạm giữ khi đặt lịch hẹn. Khi gặp thực tế, Chủ trọ ứng tiền mặt/CK trả 100% cho khách.
        </p>
        <p className="leading-relaxed">
          2. <strong>Hoa hồng sàn (`phiThu`)</strong>: Sàn chỉ thu khi cả hai bên cùng bấm xác nhận thuê thành công (`khachHangDongY = true` && `chuTroDongY = true`). Số tiền còn lại (`soTienCoc - phiThu`) chuyển vào ví Chủ trọ. Nếu không thuê, sàn hoàn trả 100% cọc cho chủ trọ, hoa hồng thu = 0 ₫.
        </p>
      </div>

      {/* Fees Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Mã & Loại phòng trọ</th>
                <th className="py-3 px-4">Mô tả đặc trưng</th>
                <th className="py-3 px-4">Tiền cọc giữ chân (`soTienCoc`)</th>
                <th className="py-3 px-4">Hoa hồng sàn trích thu (`phiThu`)</th>
                <th className="py-3 px-4 text-right">Điều chỉnh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fees.map((f) => (
                <tr key={f.maLoaiPhong} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{f.tenLoaiPhong}</span>
                    <code className="text-[10px] text-blue-600 font-mono">{f.maLoaiPhong}</code>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs">{f.moTa || '--'}</td>
                  <td className="py-3 px-4 font-black text-slate-900 text-sm">
                    {formatVND(f.soTienCoc)}
                  </td>
                  <td className="py-3 px-4 font-black text-blue-600 text-sm">
                    {formatVND(f.phiThu)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleStartEdit(f)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 ml-auto cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      Cập nhật
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CẬP NHẬT BIỂU PHÍ */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cập nhật biểu phí: {editingItem.tenLoaiPhong}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Mã cấu hình: {editingItem.maLoaiPhong}</p>
            </div>

            <form onSubmit={handleSaveFee} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mức tiền cọc giữ chân xem phòng (VNĐ)
                </label>
                <input
                  type="number"
                  step={10000}
                  value={editCoc}
                  onChange={(e) => setEditCoc(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mức phí hoa hồng trích thu sàn (VNĐ)
                </label>
                <input
                  type="number"
                  step={5000}
                  value={editPhi}
                  onChange={(e) => setEditPhi(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold text-blue-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="w-1/2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Lưu cấu hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
