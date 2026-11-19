import React from 'react';
import { CalendarCheck, CheckSquare, Eye, Search, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppButton } from '@/components/common/AppButton';
import { PageContainer } from '@/components/common/PageContainer';

const SWIMLANE_STEPS = [
  {
    step: '01',
    title: 'Tìm phòng & Đặt lịch',
    description:
      'Chọn phòng phù hợp trên bản đồ, chọn khung giờ hẹn và giữ chỗ để đảm bảo lịch xem.',
    icon: Search,
  },
  {
    step: '02',
    title: 'Chủ trọ xác nhận lịch',
    description:
      'Chủ trọ tiếp nhận và xác nhận lịch hẹn, đảm bảo buổi gặp mặt diễn ra đúng giờ.',
    icon: CalendarCheck,
  },
  {
    step: '03',
    title: 'Xem phòng & Nhận lại cọc',
    description:
      'Gặp chủ trọ xem phòng thực tế và nhận lại 100% tiền cọc trực tiếp ngay tại buổi gặp.',
    icon: Eye,
  },
  {
    step: '04',
    title: 'Xác nhận kết quả',
    description:
      'Hai bên tự xác nhận quyết định sau khi xem phòng. Nếu không thuê, bạn không mất phí.',
    icon: CheckSquare,
  },
];

export const DepositMechanismSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-white border-t border-slate-200 py-12">
      <PageContainer width="wide" className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
            Cơ chế bảo chứng 2 chiều
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Quy trình đặt lịch & hoàn cọc minh bạch
          </h2>
          <p className="text-sm text-slate-600">
            Bảo vệ Chủ trọ khỏi tình trạng bỏ hẹn và bảo vệ Khách thuê không mất tiền oan khi xem phòng
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SWIMLANE_STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-mono font-bold text-teal-700">{item.step}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-1">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Cam kết hoàn cọc */}
        <div className="bg-teal-50 rounded-2xl border border-teal-200 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 max-w-2xl">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Cam kết hoàn trả 100% cọc giữ chân xem phòng
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Tiền cọc giữ chân giúp xác nhận thiện chí lịch hẹn và được hoàn lại đủ 100% khi bạn đi xem phòng. Tiền thuê hàng tháng và cọc hợp đồng do bạn và chủ trọ thỏa thuận trực tiếp.
              </p>
            </div>
          </div>

          <AppButton
            variant="primary"
            size="lg"
            onClick={() => navigate('/search')}
            className="shrink-0"
          >
            Bắt đầu tìm phòng
          </AppButton>
        </div>
      </PageContainer>
    </section>
  );
};
