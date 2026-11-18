import React, { useState } from "react";
import { AlertTriangle, X, Check } from "lucide-react";

export interface DeclineReasonModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  title?: string;
  description?: string;
  confirmButtonText?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const QUICK_REASONS = [
  "Phòng thực tế không phù hợp",
  "Bận việc đột xuất",
  "Đã tìm được phòng khác",
  "Thời gian hoặc giá không phù hợp",
  "Đổi ý định thuê khu vực này",
];

export const DeclineReasonModal: React.FC<DeclineReasonModalProps> = ({
  isOpen,
  isLoading = false,
  title = "Xác nhận không thuê phòng?",
  description = "Vui lòng cho biết lý do để hệ thống ghi nhận và hoàn tất quy trình:",
  confirmButtonText = "Xác nhận không thuê",
  onClose,
  onConfirm,
}) => {
  const [selectedQuickReason, setSelectedQuickReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  if (!isOpen) return null;

  const finalReason = customReason.trim() || selectedQuickReason || "Không phù hợp nhu cầu";

  const handleSelectQuick = (reason: string) => {
    if (selectedQuickReason === reason) {
      setSelectedQuickReason("");
    } else {
      setSelectedQuickReason(reason);
      setCustomReason("");
    }
  };

  const handleConfirm = () => {
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon cảnh báo */}
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4 text-amber-600">
          <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
        </div>

        {/* Tiêu đề & mô tả */}
        <div className="text-center mb-5">
          <h3 className="text-xl font-bold text-slate-900 mb-1.5">{title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            {description}
          </p>
        </div>

        {/* Danh sách lý do nhanh */}
        <div className="space-y-2 mb-4">
          <label className="block text-xs font-semibold text-slate-700">
            Lý do thường gặp:
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => {
              const isSelected = selectedQuickReason === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSelectQuick(r)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "border-rose-500 bg-rose-50 text-rose-700 font-medium"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-rose-600 stroke-[3]" />}
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nhập lý do khác */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Hoặc nhập lý do chi tiết:
          </label>
          <textarea
            rows={2}
            value={customReason}
            onChange={(e) => {
              setCustomReason(e.target.value);
              if (selectedQuickReason) setSelectedQuickReason("");
            }}
            placeholder="Ghi chú thêm lý do..."
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088ff] focus:border-transparent resize-none bg-slate-50/50"
          />
        </div>

        {/* Các nút hành động */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isLoading ? "Đang xử lý..." : confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeclineReasonModal;
