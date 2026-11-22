import React from 'react';
import { Banknote, MapPinned, ShieldCheck, Sparkles } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';

const TRUST_ITEMS = [
  {
    title: 'Kiểm duyệt thực tế',
    description: 'Hình ảnh, giá thuê và thông tin phòng được xác thực trước khi hiển thị.',
    icon: ShieldCheck,
  },
  {
    title: 'Hoàn cọc trực tiếp',
    description: 'Chủ trọ hoàn lại 100% tiền cọc giữ chân cho bạn ngay tại buổi xem phòng.',
    icon: Banknote,
  },
  {
    title: 'Không mất phí nếu không thuê',
    description: 'Không đạt thỏa thuận thuê, bạn không phải trả bất kỳ khoản phí nào.',
    icon: Sparkles,
  },
  {
    title: 'Tìm kiếm trên bản đồ',
    description: 'Xem vị trí phòng trực quan quanh khu vực bạn muốn và lọc theo nhu cầu.',
    icon: MapPinned,
  },
];

export const TrustMetricsStrip: React.FC = () => {
  return (
    <section className="bg-white border-b border-slate-200">
      <PageContainer width="wide" className="py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900">{item.title}</h2>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </PageContainer>
    </section>
  );
};
