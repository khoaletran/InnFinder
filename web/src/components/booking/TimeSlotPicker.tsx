import React, { useEffect, useState } from "react";
import { AlertCircle, Check, Clock, X } from "lucide-react";

export interface TimeSlotPickerProps {
  selectedTime: string;
  onSelectTime: (time: string) => void;
  selectedDate: string; // YYYY-MM-DD
  bookedDateTimes?: string[];
  bufferMinutes?: number;
  isCustomModalOpen?: boolean;
  setIsCustomModalOpen?: (open: boolean) => void;
}

// Danh sách các khung giờ xem phòng phổ biến (Định dạng 24h)
const TIME_SLOTS = [
  "08:30",
  "09:30",
  "10:30",
  "11:30",
  "14:00",
  "15:00",
  "16:30",
  "17:30",
  "18:30",
  "19:30",
];

// Các mốc giờ phục vụ dẫn xem phòng trong ngày (07:00 -> 21:00)
const HOURS_24 = [
  "07", "08", "09", "10", "11", "12",
  "13", "14", "15", "16", "17", "18",
  "19", "20", "21"
];

// Các mốc phút thông dụng
const MINUTES = ["00", "15", "30", "45"];

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedTime,
  onSelectTime,
  selectedDate,
  bookedDateTimes = [],
  bufferMinutes = 120,
  isCustomModalOpen: externalModalOpen,
  setIsCustomModalOpen: externalSetModalOpen,
}) => {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = externalModalOpen !== undefined ? externalModalOpen : internalModalOpen;
  const setIsModalOpen = externalSetModalOpen !== undefined ? externalSetModalOpen : setInternalModalOpen;

  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // State tạm trong modal
  const initialHour = selectedTime ? selectedTime.split(":")[0] : "14";
  const initialMinute = selectedTime ? selectedTime.split(":")[1] : "30";
  const [tempHour, setTempHour] = useState<string>(initialHour);
  const [tempMinute, setTempMinute] = useState<string>(initialMinute);

  useEffect(() => {
    if (selectedTime && selectedTime.includes(":")) {
      const [h, m] = selectedTime.split(":");
      setTempHour(h);
      setTempMinute(m);
    }
  }, [selectedTime]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const getSlotStatus = (hourStr: string, minuteStr: string) => {
    if (!selectedDate) {
      return { tooClose: false, bookedConflict: false, exactBooked: false, disabled: false };
    }
    const [year, month, day] = selectedDate.split("-").map(Number);
    const h = Number(hourStr);
    const m = Number(minuteStr);
    const slotMs = new Date(year, month - 1, day, h, m, 0, 0).getTime();

    const tooClose = slotMs < nowMs + 3 * 60 * 60 * 1000;
    const bufferMs = bufferMinutes * 60 * 1000;

    let bookedConflict = false;
    let exactBooked = false;
    for (const rawDt of bookedDateTimes) {
      const bookedMs = new Date(rawDt).getTime();
      if (Number.isNaN(bookedMs)) continue;
      const diff = Math.abs(slotMs - bookedMs);
      if (diff < bufferMs) {
        bookedConflict = true;
        if (diff < 60_000) exactBooked = true;
      }
    }

    return {
      tooClose,
      bookedConflict,
      exactBooked,
      disabled: tooClose || bookedConflict,
    };
  };

  const checkIsDisabled = (hourStr: string, minuteStr: string): boolean =>
    getSlotStatus(hourStr, minuteStr).disabled;

  const currentModalStatus = getSlotStatus(tempHour, tempMinute);
  const isCurrentModalTimeDisabled = currentModalStatus.disabled;

  const handleConfirmCustomTime = () => {
    if (isCurrentModalTimeDisabled) return;
    onSelectTime(`${tempHour}:${tempMinute}`);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* HEADER: Tiêu đề + Nút "Chọn giờ cụ thể?" */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Khung giờ xem phổ biến (24h)
        </label>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1.5 hover:underline cursor-pointer bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Chọn giờ cụ thể?</span>
        </button>
      </div>

      {/* DANH SÁCH KHUNG GIỜ PHỔ BIẾN */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {TIME_SLOTS.map((time) => {
          const [h, m] = time.split(":");
          const status = getSlotStatus(h, m);
          const isSelected = selectedTime === time && !status.disabled;

          return (
            <button
              type="button"
              key={time}
              disabled={status.disabled}
              onClick={() => onSelectTime(time)}
              title={
                status.bookedConflict
                  ? status.exactBooked
                    ? "Khung giờ này đã có khách đặt"
                    : "Nằm trong khoảng đệm 2 giờ quanh lịch đã đặt"
                  : status.tooClose
                    ? "Cách hiện tại dưới 3 tiếng"
                    : undefined
              }
              className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all border text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer disabled:cursor-not-allowed ${
                status.disabled
                  ? "bg-slate-100 border-slate-200 text-slate-400 opacity-60"
                  : isSelected
                    ? "bg-teal-600 border-teal-600 text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50/50"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Clock className={`w-3 h-3 ${isSelected ? "text-white" : "text-slate-400"}`} />
                <span className="font-mono">{time}</span>
              </div>
              {status.bookedConflict && !status.tooClose && (
                <span className="text-[10px] font-medium text-slate-400 leading-tight">
                  {status.exactBooked ? "Đã đặt" : "Đệm 2h"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* HIỂN THỊ NẾU ĐÃ CHỌN GIỜ TÙY BIẾN NGOÀI CÁC KHUNG PHỔ BIẾN */}
      {selectedTime && !TIME_SLOTS.includes(selectedTime) && (
        <div className="pt-1 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-600 text-white text-xs font-semibold shadow-xs">
            <Check className="w-3.5 h-3.5" />
            <span>Giờ cụ thể đã chọn: <strong className="font-mono">{selectedTime}</strong> (24h)</span>
          </span>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-xs text-teal-600 hover:underline cursor-pointer font-medium"
          >
            Đổi giờ
          </button>
        </div>
      )}

      {/* HỘP THOẠI MODAL CHỌN GIỜ CỤ THỂ THEO CHUẨN 24H (KHÔNG AM/PM) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Chọn giờ xem phòng</h3>
                  <p className="text-[11px] text-slate-500">Định dạng 24 giờ (00:00 - 23:59)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* Hiển thị số giờ to & rõ nét */}
              <div className="flex items-center justify-center p-3.5 bg-teal-50/90 rounded-2xl border border-teal-200/90 text-center">
                <div>
                  <div className="text-3xl font-extrabold text-teal-800 font-mono tracking-wider">
                    {tempHour}:{tempMinute}
                  </div>
                  <div className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider mt-0.5">
                    Hệ 24 giờ · Không dùng AM/PM
                  </div>
                </div>
              </div>

              {/* Lưới chọn Giờ (07 -> 21) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Chọn giờ (24h)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {HOURS_24.map((hour) => {
                    const isSelected = tempHour === hour;
                    const disabled = MINUTES.every((m) => checkIsDisabled(hour, m));

                    return (
                      <button
                        type="button"
                        key={hour}
                        disabled={disabled}
                        onClick={() => setTempHour(hour)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold font-mono transition-all border text-center cursor-pointer disabled:cursor-not-allowed ${
                          disabled
                            ? "bg-slate-50 border-slate-200 text-slate-300 opacity-50"
                            : isSelected
                              ? "bg-teal-600 border-teal-600 text-white shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50/50"
                        }`}
                      >
                        {hour}:00
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lưới chọn Phút (00, 15, 30, 45) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Chọn phút
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {MINUTES.map((minute) => {
                    const isSelected = tempMinute === minute;
                    const disabled = checkIsDisabled(tempHour, minute);

                    return (
                      <button
                        type="button"
                        key={minute}
                        disabled={disabled}
                        onClick={() => setTempMinute(minute)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold font-mono transition-all border text-center cursor-pointer disabled:cursor-not-allowed ${
                          disabled
                            ? "bg-slate-50 border-slate-200 text-slate-300 opacity-50"
                            : isSelected
                              ? "bg-teal-600 border-teal-600 text-white shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50/50"
                        }`}
                      >
                        :{minute}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cảnh báo nếu giờ chọn sát giờ hiện tại (< 3 tiếng) hoặc trùng khoảng đệm 2h */}
              {isCurrentModalTimeDisabled && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {currentModalStatus.bookedConflict
                      ? "Khung giờ này đã có khách đặt hoặc nằm trong khoảng đệm 2 giờ quanh lịch hẹn khác."
                      : "Giờ hẹn phải cách thời điểm hiện tại tối thiểu 3 tiếng để Chủ trọ kịp duyệt lịch."}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isCurrentModalTimeDisabled}
                onClick={handleConfirmCustomTime}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Xác nhận ({tempHour}:{tempMinute})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSlotPicker;
