import { useState } from 'react';
import type { FormEvent } from 'react';
import { BedDouble, House, KeyRound, Map, MapPin, Search, ShieldCheck, Sofa } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/common/PageContainer';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';

export function HeroSection() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function goToSearch(useDescription: boolean) {
    const keyword = useDescription ? query.trim() : '';
    const filters = useRoomFilterStore.getState();
    filters.resetFilter();
    filters.setKeyword(keyword);
    if (!useDescription) {
      navigate('/search/map');
      return;
    }
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
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
        <form onSubmit={submit} className="relative flex w-full max-w-3xl flex-col gap-2 rounded-2xl border border-teal-100 bg-white p-2 text-sm shadow-sm sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 items-center px-2.5">
            <span className="sr-only">Mô tả phòng bạn cần</span>
            <input
              className="h-10 min-w-0 w-full rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mô tả phòng cần tìm (VD: có gác, dưới 3 triệu…)"
            />
          </label>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              className="inline-flex flex-1 sm:flex-none h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-teal-700 px-4 font-semibold text-white hover:bg-teal-800 transition-colors cursor-pointer"
            >
              <Search aria-hidden="true" className="size-4" /> Tìm phòng
            </button>
            <button
              type="button"
              onClick={() => goToSearch(false)}
              className="inline-flex flex-1 sm:flex-none h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-teal-50 px-4 font-semibold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
            >
              <Map aria-hidden="true" className="size-4" /> Xem bản đồ
            </button>
          </div>
        </form>
      </PageContainer>
    </section>
  );
}
