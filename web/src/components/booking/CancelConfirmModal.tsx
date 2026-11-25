import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  X,
  Check,
  Loader2,
  ShieldCheck,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { authUserService } from "@/services/authUser.service";
import type { BankAccountResponse } from "@/types/auth-user.types";
import { formatVND } from "@/utils/formatters";

export interface BankInfoInput {
  tenNganHang: string;
  soTaiKhoan: string;
  tenChuTaiKhoan: string;
}

export interface CancelConfirmModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirmCancel: (reason: string, bankInfo?: BankInfoInput) => void | Promise<void>;
  title?: string;
  description?: string;
  cancelButtonText?: string;
  keepButtonText?: string;
  requireReason?: boolean;
  depositAmount?: number;
  isRefundEligible?: boolean;
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
  depositAmount,
  isRefundEligible = false,
}) => {
  const [selectedQuickReason, setSelectedQuickReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  // Quản lý danh sách tài khoản ngân hàng đã liên kết
  const [savedBanks, setSavedBanks] = useState<BankAccountResponse[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [isFetchingBanks, setIsFetchingBanks] = useState<boolean>(false);

  const needBankInfo = isRefundEligible && depositAmount && depositAmount > 0;

  // Kiểm tra tài khoản ngân hàng đã liên kết khi lịch hẹn có hoàn cọc
  useEffect(() => {
    if (!needBankInfo) return;

    let isMounted = true;
    setIsFetchingBanks(true);
    authUserService
      .getMyBankAccounts()
      .then((banks) => {
        if (!isMounted) return;
        setIsFetchingBanks(false);
        if (banks && banks.length > 0) {
          setSavedBanks(banks);
          setSelectedBankId(banks[0].id || 0);
        } else {
          setSavedBanks([]);
          setSelectedBankId(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsFetchingBanks(false);
          setSavedBanks([]);
          setSelectedBankId(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [needBankInfo]);

  const finalReason = customReason.trim() || selectedQuickReason;
  const hasLinkedBank = !needBankInfo || savedBanks.length > 0;
  const isConfirmDisabled = (requireReason && !finalReason) || !hasLinkedBank || isLoading || isFetchingBanks;

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

    const selectedBank = savedBanks.find((b) => b.id === selectedBankId) || savedBanks[0];
    const bankInfo: BankInfoInput | undefined = needBankInfo && selectedBank
      ? {
          tenNganHang: selectedBank.tenNganHang,
          soTaiKhoan: selectedBank.soTaiKhoan,
          tenChuTaiKhoan: selectedBank.tenChuTaiKhoan || "",
        }
      : undefined;

    onConfirmCancel(finalReason || "Khách hàng hủy lịch", bankInfo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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
          <h3 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
            {title}
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-md mx-auto whitespace-pre-line font-sans">
            {description}
          </p>
        </div>

        {/* Khối kiểm tra tài khoản ngân hàng nhận hoàn tiền */}
        {needBankInfo && (
          <div className="mb-4">
            {isFetchingBanks ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                <span>Đang kiểm tra tài khoản ngân hàng liên kết...</span>
              </div>
            ) : savedBanks.length === 0 ? (
              /* TRƯỜNG HỢP CHƯA LIÊN KẾT NGÂN HÀNG: Hiển thị thông báo và dẫn link sang trang Profile */
              <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl text-center space-y-2.5">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950">
                    Bạn chưa liên kết tài khoản ngân hàng!
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed max-w-sm mx-auto">
                    Lịch hẹn này đủ điều kiện hoàn 100% tiền cọc (<strong>{formatVND(depositAmount)}</strong>). Vui lòng liên kết tài khoản ngân hàng tại mục Hồ sơ trước khi thực hiện hủy lịch.
                  </p>
                </div>
                <div className="pt-1">
                  <a
                    href="/profile?tab=bank"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <span>Đi đến Liên kết ngân hàng (Hồ sơ cá nhân)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              /* TRƯỜNG HỢP ĐÃ LIÊN KẾT: Hiển thị thông tin tài khoản nhận hoàn cọc */
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Hoàn 100% tiền cọc ({formatVND(depositAmount)})</span>
                  </div>
                  <a
                    href="/profile?tab=bank"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10.5px] text-teal-700 hover:text-teal-900 hover:underline inline-flex items-center gap-0.5 font-medium"
                  >
                    Quản lý liên kết <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                {savedBanks.length === 1 ? (
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-100 flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 text-teal-600 shrink-0" />
                    <div className="text-left text-xs">
                      <span className="font-bold text-slate-800 block">
                        {savedBanks[0].tenNganHang} - {savedBanks[0].soTaiKhoan}
                      </span>
                      <span className="text-slate-500 block text-[11px]">
                        Chủ tài khoản: {savedBanks[0].tenChuTaiKhoan || "Chính chủ"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <span className="block text-[11px] font-bold text-slate-700">
                      Chọn tài khoản ngân hàng nhận tiền hoàn:
                    </span>
                    <div className="space-y-1.5">
                      {savedBanks.map((bank) => {
                        const isSelected = selectedBankId === bank.id;
                        return (
                          <label
                            key={bank.id}
                            onClick={() => setSelectedBankId(bank.id || 0)}
                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? "bg-white border-teal-500 shadow-xs ring-1 ring-teal-500"
                                : "bg-white/70 border-slate-200 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="radio"
                                name="bank_choice"
                                checked={isSelected}
                                onChange={() => setSelectedBankId(bank.id || 0)}
                                className="text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />
                              <CreditCard className="w-4 h-4 text-teal-600 shrink-0" />
                              <div className="text-left text-[11px] truncate">
                                <span className="font-bold text-slate-800 block truncate">
                                  {bank.tenNganHang} - {bank.soTaiKhoan}
                                </span>
                                <span className="text-slate-500 block text-[10px]">
                                  Chủ TK: {bank.tenChuTaiKhoan || "Chính chủ"}
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
            <span>
              {needBankInfo && savedBanks.length === 0
                ? "Cần liên kết ngân hàng trước"
                : cancelButtonText}
            </span>
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
