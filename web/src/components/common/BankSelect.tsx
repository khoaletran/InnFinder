import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Landmark, Search } from 'lucide-react';
import { type BankInfo, VIETNAM_BANKS } from '@/constants/banks';

interface BankSelectProps {
  value: string; // shortName or code
  onChange: (shortName: string, bank: BankInfo) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
}

export const BankSelect: React.FC<BankSelectProps> = ({
  value,
  onChange,
  label,
  error,
  placeholder = 'Chọn ngân hàng nhận tiền',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchInputId = useId();

  // Find currently selected bank
  const selectedBank = VIETNAM_BANKS.find(
    (b) =>
      b.shortName.toLowerCase() === value?.toLowerCase() ||
      b.code.toLowerCase() === value?.toLowerCase(),
  );

  // Filter banks by search query
  const filteredBanks = VIETNAM_BANKS.filter((b) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      b.shortName.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      b.fullName.toLowerCase().includes(q)
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input on open
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (bank: BankInfo) => {
    onChange(bank.shortName, bank);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleImageError = (code: string) => {
    setImgErrors((prev) => ({ ...prev, [code]: true }));
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3 py-2.5 rounded-xl border bg-white flex items-center justify-between text-left transition-all cursor-pointer ${
          error
            ? 'border-red-300 ring-2 ring-red-100'
            : isOpen
              ? 'border-teal-500 ring-2 ring-teal-100 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          {selectedBank ? (
            <>
              <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                {!imgErrors[selectedBank.code] && selectedBank.logoUrl ? (
                  <img
                    src={selectedBank.logoUrl}
                    alt={selectedBank.shortName}
                    onError={() => handleImageError(selectedBank.code)}
                    className="w-full h-full object-contain p-0.5"
                  />
                ) : (
                  <Landmark className="w-3.5 h-3.5 text-teal-600" />
                )}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-slate-900 mr-2">
                  {selectedBank.shortName}
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline truncate">
                  ({selectedBank.fullName})
                </span>
              </div>
            </>
          ) : (
            <span className="text-xs text-slate-400 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-slate-400" />
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-teal-600' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id={searchInputId}
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên ngân hàng, mã (VCB, MB...)"
                aria-label="Tìm kiếm ngân hàng"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
              />
            </div>
          </div>

          {/* Bank Items List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredBanks.length > 0 ? (
              filteredBanks.map((bank) => {
                const isSelected =
                  selectedBank?.shortName.toLowerCase() === bank.shortName.toLowerCase();
                return (
                  <button
                    key={bank.code}
                    type="button"
                    onClick={() => handleSelect(bank)}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50 text-teal-800 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {!imgErrors[bank.code] && bank.logoUrl ? (
                          <img
                            src={bank.logoUrl}
                            alt={bank.shortName}
                            onError={() => handleImageError(bank.code)}
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-teal-700">
                            {bank.code.slice(0, 3)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{bank.shortName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                            {bank.code}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">{bank.fullName}</p>
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0 ml-2" />}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                Không tìm thấy ngân hàng khớp với &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );
};
