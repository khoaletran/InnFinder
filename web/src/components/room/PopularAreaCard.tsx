import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';

interface PopularAreaProps {
  id: string;
  name: string;
  roomCountText: string;
  keyword: string;
  imageUrl: string;
}

export const PopularAreaCard: React.FC<PopularAreaProps> = ({
  name,
  roomCountText,
  keyword,
  imageUrl,
}) => {
  const navigate = useNavigate();
  const setKeyword = useRoomFilterStore((s) => s.setKeyword);

  const handleClick = () => {
    setKeyword(keyword);
    navigate(`/search?keyword=${encodeURIComponent(keyword)}`);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative h-44 sm:h-52 rounded-2xl overflow-hidden cursor-pointer border border-slate-200 shadow-xs transition-all duration-200 hover:border-teal-500"
    >
      <img
        src={imageUrl}
        alt={name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/25 to-transparent" />
      <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
        <h3 className="text-base sm:text-lg font-bold tracking-tight group-hover:text-teal-200 transition-colors">
          {name}
        </h3>
        <p className="text-xs font-medium text-slate-100 mt-0.5">{roomCountText}</p>
      </div>
    </div>
  );
};
