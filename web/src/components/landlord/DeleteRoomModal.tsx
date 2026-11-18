import React from 'react';
import { Modal } from '../common/Modal';
import { AlertTriangle, Trash2 } from 'lucide-react';

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
      title="Xác nhận xóa phòng trọ"
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
            {loading ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
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
            Bạn có chắc chắn muốn xóa phòng này?
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Phòng: <strong className="text-slate-700">"{roomName}"</strong>
          </p>
          <p className="text-xs text-red-500 mt-2 font-medium">
            Hành động này sẽ xóa dữ liệu phòng và hình ảnh khỏi hệ thống tìm kiếm.
          </p>
        </div>
      </div>
    </Modal>
  );
};
