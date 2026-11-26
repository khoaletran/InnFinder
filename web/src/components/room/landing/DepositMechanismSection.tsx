import React from 'react';
import { CalendarCheck, CheckSquare, Eye, Search } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';

const STEPS = [
  { step: '01', title: 'Chọn phòng', description: 'Tìm phòng phù hợp với nhu cầu.', icon: Search },
  { step: '02', title: 'Đặt lịch xem', description: 'Chọn giờ, nộp cọc và chờ chủ trọ xác nhận.', icon: CalendarCheck },
  { step: '03', title: 'Xem & nhận cọc', description: 'Nhận lại cọc trực tiếp từ chủ trọ khi đến xem.', icon: Eye },
  { step: '04', title: 'Quyết định thuê', description: 'Xác nhận đã nhận cọc, rồi hai bên chọn thuê hoặc không.', icon: CheckSquare },
];

export const DepositMechanismSection: React.FC = () => (
  <section aria-labelledby="viewing-process-title" className="border-t border-slate-200 bg-white py-7 sm:py-8">
    <PageContainer width="wide" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-teal-700">Dễ hẹn, rõ cọc</p>
          <h2 id="viewing-process-title" className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Xem phòng trong 4 bước</h2>
        </div>
      </div>

      <ol className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 lg:grid-cols-4">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          return (
            <li key={item.step} className={
              'group relative p-4 text-center transition-colors hover:bg-teal-50/50 sm:p-5 ' +
              (index % 2 === 1 ? 'border-l border-slate-200 ' : '') +
              (index > 1 ? 'border-t border-slate-200 lg:border-t-0 ' : '') +
              (index === 2 ? 'lg:border-l ' : '')
            }>
              <div className="mb-4 flex items-center justify-center">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50 to-teal-100 text-teal-700 shadow-sm shadow-teal-900/5 transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transform-none sm:h-16 sm:w-16">
                  <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="absolute right-3 top-3 font-mono text-2xl font-bold tracking-tight text-slate-200 sm:right-4 sm:top-4" aria-hidden="true">{item.step}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.description}</p>
            </li>
          );
        })}
      </ol>

    </PageContainer>
  </section>
);
