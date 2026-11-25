import { useState } from 'react';
import type { FormEvent } from 'react';
import { BedDouble, House, KeyRound, Map, MapPin, ShieldCheck, Sofa, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/common/PageContainer';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';

export function HeroSection() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('TP. Hồ Chí Minh');
  const [price, setPrice] = useState('');

  function goToSearch(useDescription: boolean) {
    const description = useDescription ? query.trim() : '';
    const keyword = description ? [description, area && 'tại ' + area].filter(Boolean).join(' ') : area;
    const filters = useRoomFilterStore.getState();
    filters.resetFilter();
    filters.setPriceRange(undefined, price ? Number(price) : undefined);
    filters.setKeyword(keyword);
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (!description && area) params.set('mode', 'area');
    navigate({ pathname: '/search', search: params.toString() });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToSearch(true);
  }

  return (
    <section className="relative overflow-hidden border-b border-teal-100 bg-teal-50">
      <PageContainer width="wide" className="relative flex min-h-[240px] flex-col items-center justify-center gap-4 py-6 text-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-4 top-7 hidden justify-between text-teal-600 lg:flex">
          <div className="flex items-start gap-5"><KeyRound className="mt-8 size-9 -rotate-12" /><House className="size-10 rotate-12" /></div>
          <div className="flex items-start gap-5"><MapPin className="size-9 -rotate-12" /><BedDouble className="mt-7 size-10 rotate-12" /><Sofa className="size-8" /></div>
        </div>
        <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-800"><ShieldCheck aria-hidden="true" className="size-4" /> Phòng kiểm duyệt thực tế</span>
        <h1 className="relative text-2xl font-extrabold tracking-tight text-slate-900 lg:text-[30px]">Tìm phòng trọ minh bạch, <span className="text-teal-700">đặt lịch xem an toàn</span></h1>
        <form onSubmit={submit} className="relative grid w-full max-w-5xl grid-cols-2 gap-2 rounded-2xl border border-teal-100 bg-white p-2 text-sm shadow-sm md:flex md:items-center">
          <label className="col-span-2 flex min-w-0 flex-1 items-center gap-2 px-2"><Sparkles aria-hidden="true" className="size-4 shrink-0 text-teal-700" /><span className="sr-only">Mô tả phòng bạn cần</span><input className="h-10 min-w-0 w-full rounded text-slate-900 focus-visible:outline-teal-700" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Phòng có gác dưới 3 triệu…" /></label>
          <select aria-label="Khu vực" className="h-10 min-w-0 rounded-lg bg-slate-50 px-2" value={area} onChange={(e) => setArea(e.target.value)}>
            {['TP. Hồ Chí Minh', 'Bình Thạnh', 'Gò Vấp', 'Quận 7', 'Thủ Đức', ''].map((name) => <option key={name} value={name}>{name || 'Mọi khu vực'}</option>)}
          </select>
          <select aria-label="Mức giá" className="h-10 min-w-0 rounded-lg bg-slate-50 px-2" value={price} onChange={(e) => setPrice(e.target.value)}>
            <option value="">Mọi mức giá</option><option value="3000000">Dưới 3 triệu</option><option value="5000000">Dưới 5 triệu</option><option value="8000000">Dưới 8 triệu</option>
          </select>
          <button type="submit" className="h-10 whitespace-nowrap rounded-lg bg-teal-700 px-3 font-semibold text-white hover:bg-teal-800">Tìm phòng</button>
          <button type="button" onClick={() => goToSearch(false)} className="inline-flex h-10 items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-teal-50 px-3 font-semibold text-teal-800 hover:bg-teal-100"><Map aria-hidden="true" className="size-4" /> Xem bản đồ</button>
        </form>
      </PageContainer>
    </section>
  );
}
