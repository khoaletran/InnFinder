import React, { useState } from "react";
import { AlertTriangle, X, Check, Loader2 } from "lucide-react";

export interface CancelConfirmModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirmCancel: (reason: string) => void | Promise<void>;
  title?: string;
  description?: string;
  cancelButtonText?: string;
  keepButtonText?: string;
  requireReason?: boolean;
}

// 5 lý do mẫu thường gặp khi hủy lịch xem phòng (đồng bộ 100% với Mobile)
const QUICK_REASONS = [
  "Phòng thực tế không phù hợp",
  "Bận việc đột xuất",
  "Đã tìm được phòng khác",
  "Thời gian không phù hợp",
  "Đổi ý định thuê khu vực này",
];

const CancelConfirmModalContent: React.FC<Omit<CancelConfirmModalProps, "isOpen">> = ({
  isLoading = false,
  onClose,
  onConfirmCancel,
  title = "Hủy lịch xem phòng",
  description = "Vui lòng cho biết lý do bạn muốn hủy lịch hẹn này",
  cancelButtonText = "Xác nhận hủy",
  keepButtonText = "Giữ lại lịch",
  requireReason = true,
}) => {
  const [selectedQuickReason, setSelectedQuickReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  const finalReason = customReason.trim() || selectedQuickReason;
  const isConfirmDisabled = (requireReason && !finalReason) || isLoading;

  const handleSelectQuick = (reason: string) => {
    if (selectedQuickReason === reason) {
      setSelectedQuickReason("");
    } else {
      setSelectedQuickReason(reason);
      setCustomReason("");
    }
  };

  const handleConfirm = () => {
    if (isConfirmDisabled) return;
    onConfirmCancel(finalReason || "Khách hàng hủy lịch");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon cảnh báo tròn vàng */}
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-3 text-amber-600">
          <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
        </div>

        {/* Tiêu đề & mô tả */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        </div>

        {/* Khối chọn lý do (nếu yêu cầu lý do) */}
        {requireReason && (
          <div className="space-y-3 mb-5">
            {/* 1. Danh sách lý do nhanh */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Lý do thường gặp:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((reason) => {
                  const isSelected = selectedQuickReason === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => handleSelectQuick(reason)}
                      disabled={isLoading}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "border-rose-400 bg-rose-50 text-rose-700 font-semibold shadow-xs"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
                      )}
                      <span>{reason}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Ô nhập lý do chi tiết */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hoặc nhập lý do khác:
              </label>
              <textarea
                rows={2}
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  if (e.target.value && selectedQuickReason) {
                    setSelectedQuickReason("");
                  }
                }}
                disabled={isLoading}
                placeholder="Nhập lý do chi tiết (tùy chọn nếu đã chọn ở trên)..."
                maxLength={200}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none bg-slate-50/50 text-slate-800 placeholder:text-slate-400 transition-all"
              />
              <div className="flex justify-between items-center mt-1 text-[11px] text-slate-400">
                <span>
                  {!finalReason ? "* Vui lòng chọn hoặc nhập lý do để tiếp tục" : ""}
                </span>
                <span>{customReason.length}/200</span>
              </div>
            </div>
          </div>
        )}

        {/* Cụm nút hành động góc phải */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {keepButtonText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition-all shadow-xs shadow-rose-600/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{cancelButtonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const CancelConfirmModal: React.FC<CancelConfirmModalProps> = ({ isOpen, ...rest }) => {
  if (!isOpen) return null;
  return <CancelConfirmModalContent {...rest} />;
};

export default CancelConfirmModal;
