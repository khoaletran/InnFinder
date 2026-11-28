import React from 'react';
import { List, Map as MapIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SearchModeTabs: React.FC<{ activeMode: 'list' | 'map' }> = ({ activeMode }) => (
  <div
    role="navigation"
    aria-label="Chế độ tìm kiếm"
    className="bg-slate-100 p-1 rounded-xl inline-flex items-center gap-1 shrink-0"
  >
    <Link
      to="/search"
      aria-current={activeMode === 'list' ? 'page' : undefined}
      className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
        activeMode === 'list'
          ? 'bg-white text-teal-800 shadow-xs'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <List className="w-3.5 h-3.5" />
      <span>Danh sách</span>
    </Link>
    <Link
      to="/search/map"
      aria-current={activeMode === 'map' ? 'page' : undefined}
      className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
        activeMode === 'map'
          ? 'bg-white text-teal-800 shadow-xs'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      <MapIcon className="w-3.5 h-3.5" />
      <span>Bản đồ</span>
    </Link>
  </div>
);
