import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { roomService } from '@/services/room.service';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
}

const PRICE_PRESETS = [
  { label: 'Tất cả mức giá', min: undefined, max: undefined },
  { label: 'Dưới 3 triệu', min: 0, max: 3_000_000 },
  { label: '3 – 5 triệu', min: 3_000_000, max: 5_000_000 },
  { label: '5 – 8 triệu', min: 5_000_000, max: 8_000_000 },
  { label: 'Trên 8 triệu', min: 8_000_000, max: undefined },
];

const AREA_PRESETS = [
  { label: 'Tất cả diện tích', min: undefined, max: undefined },
  { label: 'Dưới 20 m²', min: 0, max: 20 },
  { label: '20 – 35 m²', min: 20, max: 35 },
  { label: '35 – 50 m²', min: 35, max: 50 },
  { label: 'Trên 50 m²', min: 50, max: undefined },
];

const CAPACITY_PRESETS = [
  { label: 'Tất cả', value: undefined },
  { label: '1 người', value: 1 },
  { label: '2 người', value: 2 },
  { label: '3 người', value: 3 },
  { label: '4+ người', value: 4 },
];

const RADIUS_PRESETS = [
  { label: 'Không giới hạn', value: undefined },
  { label: '≤ 3 km', value: 3 },
  { label: '≤ 5 km', value: 5 },
  { label: '≤ 10 km', value: 10 },
];

const FilterModalContent: React.FC<Omit<FilterModalProps, 'isOpen'>> = ({ onClose, onApply }) => {
  const store = useRoomFilterStore();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'room-types'],
    queryFn: roomService.getRoomTypes,
  });

  const { data: amenities = [] } = useQuery({
    queryKey: ['categories', 'amenities'],
    queryFn: roomService.getAmenities,
  });

  const [minPrice, setMinPrice] = useState<number | undefined>(store.minPrice);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(store.maxPrice);
  const [minArea, setMinArea] = useState<number | undefined>(store.minArea);
  const [maxArea, setMaxArea] = useState<number | undefined>(store.maxArea);
  const [capacity, setCapacity] = useState<number | undefined>(store.capacity);
  const [categoryId, setCategoryId] = useState<string | undefined>(store.categoryId);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(store.selectedAmenities);
  const [radiusKm, setRadiusKm] = useState<number | undefined>(store.radiusKm);

  const handleReset = () => {
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinArea(undefined);
    setMaxArea(undefined);
    setCapacity(undefined);
    setCategoryId(undefined);
    setSelectedAmenities([]);
    setRadiusKm(undefined);
  };

  const handleApply = () => {
    store.setPriceRange(minPrice, maxPrice);
    store.setAreaRange(minArea, maxArea);
    store.setCapacity(capacity);
    store.setCategoryId(categoryId);
    store.setSelectedAmenities(selectedAmenities);
    store.setRadiusKm(radiusKm);
    onApply();
    onClose();
  };

  // Đồng bộ chuẩn mã tiện ích maTienIch (^TI\d{4}$) khi lọc với Backend
  const toggleAmenity = (amenityCode: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityCode)
        ? prev.filter((a) => a !== amenityCode)
        : [...prev, amenityCode],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-700">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Bộ lọc nâng cao</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2.5">Khoảng giá thuê</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRICE_PRESETS.map((p, idx) => {
                const active = minPrice === p.min && maxPrice === p.max;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMinPrice(p.min);
                      setMaxPrice(p.max);
                    }}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                      active
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2.5">Diện tích (m²)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AREA_PRESETS.map((a, idx) => {
                const active = minArea === a.min && maxArea === a.max;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMinArea(a.min);
                      setMaxArea(a.max);
                    }}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                      active
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2.5">Loại phòng</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryId(undefined)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  categoryId === undefined
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Tất cả
              </button>
              {categories.map((c) => {
                const catId = c.maLpt || c.maLoaiPhong || '';
                const catName = c.tenLoaiPhongTro || c.tenLoaiPhong || catId;
                const active = categoryId === catId;
                return (
                  <button
                    key={catId}
                    type="button"
                    onClick={() => setCategoryId(active ? undefined : catId)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      active
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {catName}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2.5">Số người ở</h3>
            <div className="flex flex-wrap gap-2">
              {CAPACITY_PRESETS.map((cap, idx) => {
                const active = capacity === cap.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCapacity(active ? undefined : cap.value)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      active
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cap.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-sm font-bold text-slate-900">Tiện ích đi kèm</h3>
              {selectedAmenities.length > 0 && (
                <span className="text-xs text-teal-600 font-semibold">
                  Đã chọn {selectedAmenities.length}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {amenities.map((amenity) => {
                const active = selectedAmenities.includes(amenity.maTienIch);
                return (
                  <button
                    key={amenity.maTienIch}
                    type="button"
                    onClick={() => toggleAmenity(amenity.maTienIch)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                      active
                        ? 'bg-teal-50 text-teal-700 border-teal-600 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5 text-teal-600" />}
                    {amenity.tenTienIch}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2.5">
              Bán kính xung quanh vị trí bản đồ
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RADIUS_PRESETS.map((r, idx) => {
                const active = radiusKm === r.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRadiusKm(r.value)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                      active
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Thiết lập lại
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              Áp dụng kết quả
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FilterModal: React.FC<FilterModalProps> = ({ isOpen, ...rest }) => {
  if (!isOpen) return null;
  return <FilterModalContent {...rest} />;
};
