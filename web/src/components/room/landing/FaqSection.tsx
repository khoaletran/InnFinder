import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';

const FAQ_ITEMS = [
  {
    question: 'Tiền cọc giữ chân xem phòng là gì? Có khác tiền cọc hợp đồng thuê không?',
    answer:
      'Cọc giữ chân xem phòng là khoản tiền nhỏ (quy định theo từng loại phòng) nhằm xác nhận thiện chí lịch hẹn trên InnFinder. Khoản này hoàn toàn tách biệt với tiền cọc hợp đồng và tiền thuê phòng hàng tháng do bạn thỏa thuận trực tiếp với Chủ trọ.',
  },
  {
    question: 'Nếu tôi đi xem phòng nhưng không ưng ý và không thuê thì có mất tiền không?',
    answer:
      'Không. Tại buổi gặp xem phòng, Chủ trọ hoàn lại 100% tiền cọc giữ chân trực tiếp cho bạn. Khi không đạt thỏa thuận thuê, bạn không mất bất kỳ khoản phí nào.',
  },
  {
    question: 'Vì sao Chủ trọ trả lại cọc trực tiếp cho khách tại buổi xem phòng?',
    answer:
      'Cơ chế này giúp bạn nhận lại tiền ngay lập tức tại chỗ mà không cần chờ xử lý rút tiền. Sau khi bạn xác nhận đã nhận lại cọc, khoản cọc giữ chỗ sẽ được hoàn trả lại cho Chủ trọ.',
  },
  {
    question: 'Làm thế nào để đăng ký trở thành Chủ trọ trên InnFinder?',
    answer:
      'Bạn có thể chọn đăng ký làm Chủ trọ ngay khi tạo tài khoản, hoặc vào Hồ sơ cá nhân để gửi thông tin xác thực kèm CCCD và tài khoản ngân hàng. Sau khi được duyệt, bạn có thể đăng tin cho thuê ngay.',
  },
  {
    question: 'Tôi có thể phản ánh nếu thông tin phòng hoặc chủ trọ không đúng thực tế không?',
    answer:
      'Có. Bạn có thể gửi khiếu nại kèm hình ảnh bằng chứng để bộ phận hỗ trợ xác minh và xử lý kịp thời, bảo vệ quyền lợi cho bạn.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-white border-t border-slate-200 py-12">
      <PageContainer width="narrow" className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Câu hỏi thường gặp
          </h2>
          <p className="text-sm text-slate-600">
            Giải đáp nhanh về cơ chế cọc giữ chân, hoàn cọc và đăng tin trên InnFinder
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={item.question}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-slate-100/70 transition-colors"
                >
                  <span className="text-sm font-bold text-slate-900">{item.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-teal-700' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-0 text-sm text-slate-600 leading-relaxed">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PageContainer>
    </section>
  );
};
