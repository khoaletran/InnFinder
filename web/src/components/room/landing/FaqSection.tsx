import React, { useState } from 'react';
import { ChevronDown, MessageCircleQuestion } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';

const FAQ_ITEMS = [
  {
    question: 'Cọc xem phòng khác cọc hợp đồng thế nào?',
    answer: 'Cọc xem phòng giữ chỗ lịch hẹn, mức cọc tùy loại phòng. Cọc hợp đồng và tiền thuê do bạn thỏa thuận, thanh toán trực tiếp với chủ trọ.',
  },
  {
    question: 'Đi xem nhưng không thuê có mất phí không?',
    answer: 'Không mất phí khi không thuê sau buổi xem. Chủ trọ trả trực tiếp 100% cọc giữ chân; bạn xác nhận đã nhận cọc trên ứng dụng.',
  },
  {
    question: 'Vì sao chủ trọ trả cọc trực tiếp?',
    answer: 'Để bạn nhận lại tiền ngay tại buổi xem. Sau khi bạn xác nhận đã nhận cọc, quyền nhận khoản cọc sàn đang giữ chuyển sang chủ trọ. Sàn chỉ trích hoa hồng khi cả hai đồng ý thuê.',
  },
  {
    question: 'Tôi muốn đăng tin cho thuê thì làm gì?',
    answer: 'Vào Hồ sơ cá nhân, gửi hồ sơ chủ trọ gồm CCCD và thông tin ngân hàng. Khi được duyệt, bạn có thể đăng tin cho thuê.',
  },
  {
    question: 'Phòng không đúng mô tả thì phản ánh ở đâu?',
    answer: 'Gửi khiếu nại trong tài khoản, kèm mô tả và ảnh bằng chứng để quản trị viên xác minh, xử lý.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section aria-labelledby="home-faq-title" className="border-t border-slate-200 bg-white py-7 sm:py-8">
      <PageContainer width="wide" className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12">
        <div>
          <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <MessageCircleQuestion className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <h2 id="home-faq-title" className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Bạn hỏi, InnFinder đáp</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Một vài điều cần biết trước khi hẹn xem phòng.</p>
        </div>

        <div className="min-w-0 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            const buttonId = 'home-faq-question-' + index;
            const panelId = 'home-faq-answer-' + index;
            return (
              <div key={item.question} className={isOpen ? 'bg-teal-50/50' : 'bg-white'}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-600 cursor-pointer"
                  >
                    {item.question}
                    <ChevronDown aria-hidden="true" className={'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 motion-reduce:transition-none ' + (isOpen ? 'rotate-180 text-teal-700' : '')} />
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen} className="px-4 pb-4 text-sm leading-relaxed text-slate-600">
                  {item.answer}
                </div>
              </div>
            );
          })}
        </div>
      </PageContainer>
    </section>
  );
};
