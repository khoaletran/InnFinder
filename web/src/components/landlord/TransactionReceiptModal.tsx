import { Modal } from '@/components/common/Modal';
import type { LandlordTransactionItem } from '@/types/landlord.types';
import { formatDateTime, formatVND } from '@/utils/formatters';
import { TRANSACTION_STATUSES, TRANSACTION_TYPES } from './walletTransactions';

export function TransactionReceiptModal({ transaction: tx, onClose }: {
  transaction: LandlordTransactionItem | null; onClose: () => void;
}) {
  if (!tx) return null;
  const details = [
    ['Mã giao dịch', tx.maGiaoDich],
    ['Loại giao dịch', TRANSACTION_TYPES[tx.loaiGiaoDich] ?? tx.loaiGiaoDich],
    ['Trạng thái', TRANSACTION_STATUSES[tx.trangThai]],
    ['Thời gian', formatDateTime(tx.ngayGiaoDich)],
    ['Mã tham chiếu ngân hàng', tx.maThamChieuNganHang || 'Chưa có dữ liệu đối soát'],
    ['Phiếu lịch xem liên quan', tx.maDatLich || 'Chưa có thông tin liên kết'],
    ['Phòng liên quan', tx.maPhongTro || 'Chưa có thông tin liên kết'],
    ['Ngân hàng nhận', tx.nganHangNhan || '—'],
    ['Số tài khoản nhận', tx.taiKhoanNhan || '—'],
    ['Tên người nhận', tx.tenNguoiNhan || 'Chưa cung cấp'],
  ];
  return (
    <Modal isOpen onClose={onClose} title="Biên nhận giao dịch" subtitle="InnFinder · Sổ cái ví chủ trọ" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-2xl font-bold text-cyan-700">{formatVND(tx.soTien)}</p>
        <dl className="space-y-3 text-sm">
          {details.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">{label}</dt><dd className="font-medium break-all">{value}</dd>
          </div>)}
        </dl>
        {tx.cocGoc != null && <div className="rounded-xl bg-cyan-50 p-4 text-sm space-y-2">
          <p>Cọc giữ chân: <strong>{formatVND(tx.cocGoc)}</strong></p>
          <p>Hoa hồng đã khấu trừ: <strong>{formatVND(tx.phiHoaHong ?? 0)}</strong></p>
          <p>Số tiền giao dịch: <strong>{formatVND(tx.soTien)}</strong></p>
          {tx.loaiGiaoDich === 'CONG_TIEN_COC' && <p className="text-xs text-slate-600">Hoa hồng đã nằm trong khoản quyết toán, không trừ thêm lần nữa.</p>}
        </div>}
        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{tx.noiDung}</p>
        <p className="text-xs text-slate-500">Biên nhận này ghi nhận giao dịch qua InnFinder. Tiền thuê và cọc hợp đồng phòng được hai bên thanh toán trực tiếp.</p>
      </div>
    </Modal>
  );
}
