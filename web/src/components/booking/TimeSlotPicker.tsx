import React from "react";
import { Clock } from "lucide-react";

export interface TimeSlotPickerProps {
  selectedTime: string;
  onSelectTime: (time: string) => void;
  selectedDate: string; // YYYY-MM-DD
}

export const TIME_SLOTS = [
  "08:30",
  "09:30",
  "10:30",
  "14:30",
  "15:30",
  "16:30",
  "17:30",
  "18:30",
];

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedTime,
  onSelectTime,
  selectedDate,
}) => {
  // Ràng buộc: Nếu là ngày hôm nay thì giờ hẹn phải cách hiện tại ít nhất 1 tiếng
  const isSlotDisabled = (time: string): boolean => {
    if (!selectedDate) return false;
    const [year, month, day] = selectedDate.split("-").map(Number);
    const [h, m] = time.split(":").map(Number);
    const slotDate = new Date(year, month - 1, day, h, m, 0, 0);
    return slotDate.getTime() < Date.now() + 60 * 60 * 1000;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Khung giờ xem phổ biến
        </label>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Cách hiện tại tối thiểu 1 tiếng
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TIME_SLOTS.map((time) => {
          const isSelected = selectedTime === time;
          const disabled = isSlotDisabled(time);

          return (
            <button
              type="button"
              key={time}
              disabled={disabled}
              onClick={() => onSelectTime(time)}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border text-center flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed ${
                disabled
                  ? "bg-slate-50 border-slate-200 text-slate-300 opacity-60"
                  : isSelected
                    ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/50"
              }`}
            >
              <Clock className={`w-3 h-3 ${isSelected ? "text-white" : "text-slate-400"}`} />
              {time}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlotPicker;
