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
      className="group relative h-48 sm:h-56 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <img
        src={imageUrl}
        alt={name}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between text-white">
        <div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight drop-shadow-sm group-hover:text-teal-200 transition-colors">
            {name}
          </h3>
        </div>
        <div>
          <p className="text-xs sm:text-sm font-medium text-slate-200 drop-shadow-xs">
            {roomCountText}
          </p>
        </div>
      </div>
    </div>
  );
};
