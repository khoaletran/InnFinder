import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  formatUtilityFilterLabel,
  hasUtilityFilter,
  type UtilityFilterValue,
} from '@/components/room/searchHelpers';

const ELECTRICITY_PRESETS: ReadonlyArray<{ label: string; min?: number; max?: number }> = [
  { label: 'Tất cả' },
  { label: 'Thỏa thuận', min: 0, max: 0 },
  { label: '≤ 3.500đ', min: undefined, max: 3500 },
  { label: '3.500 – 4.000đ', min: 3500, max: 4000 },
  { label: '> 4.000đ', min: 4000, max: undefined },
];

const WATER_PRESETS: ReadonlyArray<{ label: string; min?: number; max?: number }> = [
  { label: 'Tất cả' },
  { label: 'Thỏa thuận', min: 0, max: 0 },
  { label: '≤ 20.000đ', min: undefined, max: 20000 },
  { label: '20k – 100k', min: 20000, max: 100000 },
  { label: '> 100.000đ', min: 100000, max: undefined },
];

const WATER_MODE_OPTIONS: ReadonlyArray<{ label: string; value: boolean | undefined }> = [
  { label: 'Tất cả', value: undefined },
  { label: 'Theo đầu người', value: true },
  { label: 'Theo m³', value: false },
];

function parseOptionalInt(raw: string): number | undefined {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return undefined;
  const num = Number(digits);
  return Number.isFinite(num) ? num : undefined;
}

interface UtilityFilterPanelProps {
  value: UtilityFilterValue;
  onApply: (next: UtilityFilterValue) => void;
  onClose: () => void;
}

const UtilityFilterPanel: React.FC<UtilityFilterPanelProps> = ({ value, onApply, onClose }) => {
  const [minElecInput, setMinElecInput] = useState(() =>
    value.minElectricityPrice !== undefined ? String(value.minElectricityPrice) : '',
  );
  const [maxElecInput, setMaxElecInput] = useState(() =>
    value.maxElectricityPrice !== undefined ? String(value.maxElectricityPrice) : '',
  );
  const [minWaterInput, setMinWaterInput] = useState(() =>
    value.minWaterPrice !== undefined ? String(value.minWaterPrice) : '',
  );
  const [maxWaterInput, setMaxWaterInput] = useState(() =>
    value.maxWaterPrice !== undefined ? String(value.maxWaterPrice) : '',
  );

  const commitDraftInputs = (e: React.FormEvent) => {
    e.preventDefault();
    let minElec = parseOptionalInt(minElecInput);
    let maxElec = parseOptionalInt(maxElecInput);
    if (minElec !== undefined && maxElec !== undefined && minElec > maxElec) {
      [minElec, maxElec] = [maxElec, minElec];
    }
    let minWater = parseOptionalInt(minWaterInput);
    let maxWater = parseOptionalInt(maxWaterInput);
    if (minWater !== undefined && maxWater !== undefined && minWater > maxWater) {
      [minWater, maxWater] = [maxWater, minWater];
    }
    onApply({
      minElectricityPrice: minElec,
      maxElectricityPrice: maxElec,
      minWaterPrice: minWater,
      maxWaterPrice: maxWater,
      waterByPerson: value.waterByPerson,
    });
    onClose();
  };

  return (
    <form
      onSubmit={commitDraftInputs}
      className="fixed inset-x-4 mt-2 sm:inset-x-auto sm:absolute sm:left-0 sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-lg p-3.5 z-50 space-y-3.5"
    >
      {/* Phần Giá điện */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span>Giá điện (VNĐ/kWh)</span>
          {(value.minElectricityPrice !== undefined || value.maxElectricityPrice !== undefined) && (
            <button
              type="button"
              onClick={() => {
                setMinElecInput('');
                setMaxElecInput('');
                onApply({
                  ...value,
                  minElectricityPrice: undefined,
                  maxElectricityPrice: undefined,
                });
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Đặt lại
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {ELECTRICITY_PRESETS.map((preset) => {
            const selected =
              value.minElectricityPrice === preset.min &&
              value.maxElectricityPrice === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setMinElecInput(preset.min !== undefined ? String(preset.min) : '');
                  setMaxElecInput(preset.max !== undefined ? String(preset.max) : '');
                  onApply({
                    ...value,
                    minElectricityPrice: preset.min,
                    maxElectricityPrice: preset.max,
                  });
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  selected
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            step={100}
            value={minElecInput}
            onChange={(e) => setMinElecInput(e.target.value)}
            placeholder="Từ (VD: 3000)"
            aria-label="Giá điện tối thiểu"
            className="w-full h-8 px-2.5 rounded-lg bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-600 text-xs text-slate-800 outline-none"
          />
          <input
            type="number"
            min={0}
            step={100}
            value={maxElecInput}
            onChange={(e) => setMaxElecInput(e.target.value)}
            placeholder="Đến (VD: 4000)"
            aria-label="Giá điện tối đa"
            className="w-full h-8 px-2.5 rounded-lg bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-600 text-xs text-slate-800 outline-none"
          />
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Phần Giá nước */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span>Giá nước (VNĐ)</span>
          {(value.minWaterPrice !== undefined ||
            value.maxWaterPrice !== undefined ||
            value.waterByPerson !== undefined) && (
            <button
              type="button"
              onClick={() => {
                setMinWaterInput('');
                setMaxWaterInput('');
                onApply({
                  ...value,
                  minWaterPrice: undefined,
                  maxWaterPrice: undefined,
                  waterByPerson: undefined,
                });
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Đặt lại
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {WATER_MODE_OPTIONS.map((mode) => {
            const selected = value.waterByPerson === mode.value;
            return (
              <button
                key={mode.label}
                type="button"
                onClick={() =>
                  onApply({
                    ...value,
                    minWaterPrice: parseOptionalInt(minWaterInput),
                    maxWaterPrice: parseOptionalInt(maxWaterInput),
                    waterByPerson: mode.value,
                  })
                }
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                  selected
                    ? 'bg-sky-50 text-sky-800 border-sky-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {WATER_PRESETS.map((preset) => {
            const selected =
              value.minWaterPrice === preset.min && value.maxWaterPrice === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setMinWaterInput(preset.min !== undefined ? String(preset.min) : '');
                  setMaxWaterInput(preset.max !== undefined ? String(preset.max) : '');
                  onApply({
                    ...value,
                    minWaterPrice: preset.min,
                    maxWaterPrice: preset.max,
                  });
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  selected
                    ? 'bg-teal-50 text-teal-800 border-teal-500'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            step={1000}
            value={minWaterInput}
            onChange={(e) => setMinWaterInput(e.target.value)}
            placeholder="Từ (VD: 20000)"
            aria-label="Giá nước tối thiểu"
            className="w-full h-8 px-2.5 rounded-lg bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-600 text-xs text-slate-800 outline-none"
          />
          <input
            type="number"
            min={0}
            step={1000}
            value={maxWaterInput}
            onChange={(e) => setMaxWaterInput(e.target.value)}
            placeholder="Đến (VD: 100000)"
            aria-label="Giá nước tối đa"
            className="w-full h-8 px-2.5 rounded-lg bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-600 text-xs text-slate-800 outline-none"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            onApply({});
            onClose();
          }}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          Xóa lọc điện/nước
        </button>
        <button
          type="submit"
          className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
        >
          Áp dụng
        </button>
      </div>
    </form>
  );
};

interface UtilityFilterPopoverProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  value: UtilityFilterValue;
  onApply: (next: UtilityFilterValue) => void;
  buttonPaddingClass?: string;
}

export const UtilityFilterPopover: React.FC<UtilityFilterPopoverProps> = ({
  isOpen,
  onToggle,
  onClose,
  value,
  onApply,
  buttonPaddingClass = 'px-2.5 xl:px-3',
}) => {
  const active = hasUtilityFilter(value);
  const label = formatUtilityFilterLabel(value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-1 h-8 sm:h-9 ${buttonPaddingClass} rounded-full text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
          active || isOpen
            ? 'bg-teal-50 text-teal-800 border-teal-500'
            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
        }`}
      >
        <span className="max-w-[82px] xl:max-w-[96px] truncate">{label}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      </button>

      {isOpen && <UtilityFilterPanel value={value} onApply={onApply} onClose={onClose} />}
    </div>
  );
};
