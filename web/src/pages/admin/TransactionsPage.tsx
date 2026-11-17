import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { AdminTransactionItem } from '../../types/admin.types';
import { formatVND, formatDateTime } from '../../utils/formatters';
import { toast } from 'sonner';

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<AdminTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedTx, setSelectedTx] = useState<AdminTransactionItem | null>(null);

  // Từ chối rút tiền
  const [rejectingTxId, setRejectingTxId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const res = await adminService.getTransactions();
      setTransactions(res);
    } catch {
      toast.error('Lỗi tải danh sách giao dịch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    try {
      await adminService.approveWithdrawal(id);
      toast.success('Đã phê duyệt lệnh rút tiền thành công!');
      loadTransactions();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi duyệt rút tiền');
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!rejectingTxId) return;
    try {
      await adminService.rejectWithdrawal(rejectingTxId, rejectReason);
      toast.success('Đã từ chối lệnh rút tiền và hoàn số dư về ví Chủ trọ!');
      setRejectingTxId(null);
      setRejectReason('');
      loadTransactions();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi từ chối rút tiền');
    }
  };

  const filtered = transactions.filter((tx) => {
    if (filterType === 'WITHDRAWAL') return tx.loaiGiaoDich === 'YEU_CAU_RUT_TIEN' || tx.loaiGiaoDich === 'RUT_TIEN';
    if (filterType === 'DEPOSIT') return tx.loaiGiaoDich.includes('COC');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sổ cái Giao dịch & Ngân khố</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ghi nhận toàn bộ biến động dòng tiền: Cọc giữ chân, hoàn cọc, nạp rút và phê duyệt lệnh rút về tài khoản ngân hàng
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'ALL', label: 'Tất cả biến động sổ cái' },
          { key: 'WITHDRAWAL', label: 'Lệnh rút tiền về ngân hàng' },
          { key: 'DEPOSIT', label: 'Giao dịch cọc giữ chân' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterType === tab.key
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Mã giao dịch</th>
                <th className="py-3 px-4">Loại giao dịch</th>
                <th className="py-3 px-4">Số tiền</th>
                <th className="py-3 px-4">Người thực hiện</th>
                <th className="py-3 px-4">Ngân hàng thụ hưởng</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải dữ liệu giao dịch...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((tx) => {
                  const isWithdrawal = tx.loaiGiaoDich === 'YEU_CAU_RUT_TIEN' || tx.loaiGiaoDich === 'RUT_TIEN';
                  const isPending = tx.trangThai === 'DANG_XU_LY' || tx.trangThai === 'CHO_THANH_TOAN';
                  return (
                    <tr key={tx.maGiaoDich} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {tx.maGiaoDich}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{tx.loaiGiaoDich}</span>
                        {tx.phongTro && <span className="text-[10px] text-slate-400 truncate max-w-xs">{tx.phongTro}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-black text-sm ${isWithdrawal ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {isWithdrawal ? '-' : '+'}{formatVND(tx.soTien)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {tx.nguoiThucHien}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {tx.tenNganHang ? (
                          <div>
                            <span className="font-bold">{tx.tenNganHang}</span>
                            <span className="block text-[10px] font-mono text-slate-400">{tx.soTaiKhoan}</span>
                          </div>
                        ) : (
                          'Ví InnFinder'
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {formatDateTime(tx.thoiGian)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.trangThai === 'THANH_CONG'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {tx.trangThai === 'THANH_CONG'
                            ? 'Thành công'
                            : isPending
                            ? 'Chờ duyệt'
                            : 'Thất bại'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTx(tx)}
                            title="Xem chi tiết (Frame 4)"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isWithdrawal && isPending && (
                            <>
                              <button
                                onClick={() => handleApproveWithdrawal(tx.maGiaoDich)}
                                title="Phê duyệt chuyển tiền"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setRejectingTxId(tx.maGiaoDich)}
                                title="Từ chối rút tiền"
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không có giao dịch nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CHI TIẾT GIAO DỊCH (FRAME 4) */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Chi tiết giao dịch: {selectedTx.maGiaoDich}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedTx.loaiGiaoDich}</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-center">
              <span className="text-xs text-slate-500 block mb-1">Số tiền giao dịch</span>
              <div className="text-2xl font-black text-slate-900">
                {formatVND(selectedTx.soTien)}
              </div>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {selectedTx.trangThai}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Người thực hiện</span>
                <span className="font-bold text-slate-800">{selectedTx.nguoiThucHien}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Thời gian tạo</span>
                <span className="text-slate-800">{formatDateTime(selectedTx.thoiGian)}</span>
              </div>
              {selectedTx.tenNganHang && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Ngân hàng nhận</span>
                  <span className="font-bold text-slate-800">
                    {selectedTx.tenNganHang} ({selectedTx.soTaiKhoan})
                  </span>
                </div>
              )}
              {selectedTx.ghiChu && (
                <div className="py-1.5 text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                  Ghi chú: {selectedTx.ghiChu}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL TỪ CHỐI RÚT TIỀN */}
      {rejectingTxId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Từ chối lệnh rút tiền</h3>
            <p className="text-xs text-slate-500 mb-3">
              Số tiền yêu cầu sẽ được hoàn lại 100% vào ví của Chủ trọ.
            </p>
            <textarea
              rows={3}
              placeholder="Nhập lý do từ chối (VD: Tên chủ tài khoản không khớp CCCD...)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-100 focus:border-red-500 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectingTxId(null)}
                className="w-1/2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleRejectWithdrawal}
                className="w-1/2 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
