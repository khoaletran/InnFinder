import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';

interface PopularAreaProps {
  name: string;
  roomCountText: string;
  keyword: string;
  imageUrl: string | null;
}

export const PopularAreaCard: React.FC<PopularAreaProps> = ({
  name,
  roomCountText,
  keyword,
  imageUrl,
}) => {
  const navigate = useNavigate();
  const [failedImage, setFailedImage] = useState<string | null>(null);

  const handleClick = () => {
    useRoomFilterStore.getState().resetFilter();
    useRoomFilterStore.getState().setKeyword(keyword);
    navigate(`/search?keyword=${encodeURIComponent(keyword)}&mode=area`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group relative h-44 sm:h-52 text-left rounded-2xl overflow-hidden cursor-pointer border border-slate-200 shadow-xs transition-all duration-200 hover:border-teal-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 bg-slate-600"
    >
      {imageUrl && failedImage !== imageUrl ? <img
        src={imageUrl}
        alt={name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        loading="lazy"
        onError={() => setFailedImage(imageUrl)}
      /> : <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-500 to-teal-900"><MapPin className="h-10 w-10 text-white/40" aria-hidden="true" /></div>}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/25 to-transparent" />
      <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
        <h3 className="text-base sm:text-lg font-bold tracking-tight group-hover:text-teal-200 transition-colors">
          {name}
        </h3>
        <p className="text-xs font-medium text-slate-100 mt-0.5">{roomCountText}</p>
      </div>
    </button>
  );
};
