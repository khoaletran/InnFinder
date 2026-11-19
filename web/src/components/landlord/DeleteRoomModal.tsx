import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';

interface DeleteRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  roomName: string;
  loading?: boolean;
}

export const DeleteRoomModal: React.FC<DeleteRoomModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  roomName,
  loading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác nhận ẩn / gỡ bài đăng phòng"
      maxWidth="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {loading ? 'Đang xử lý...' : 'Gỡ bài đăng'}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Bạn có chắc chắn muốn gỡ bài đăng phòng này?
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Phòng: <strong className="text-slate-700">&ldquo;{roomName}&rdquo;</strong>
          </p>
          <p className="text-xs text-red-500 mt-2 font-medium">
            Phòng sẽ chuyển sang trạng thái Đã hủy (HUY) và ẩn khỏi kết quả tìm kiếm công khai.
          </p>
        </div>
      </div>
    </Modal>
  );
};
