import React from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Headphones,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

interface BusinessSection {
  title: string;
  content: ReactNode;
}

interface LegalPageShellProps {
  badge: string;
  title: string;
  subtitle: string;
  updatedAt?: string;
  icon: ReactNode;
  sections: BusinessSection[];
  footerNote?: ReactNode;
}

const BUSINESS_NAV = [
  { to: '/about', label: 'Giới thiệu' },
  { to: '/terms', label: 'Điều khoản sử dụng' },
  { to: '/privacy', label: 'Chính sách bảo mật' },
  { to: '/deposit-policy', label: 'Chính sách cọc & hoàn tiền' },
  { to: '/landlord-policy', label: 'Chính sách Chủ trọ' },
  { to: '/contact', label: 'Liên hệ & Hỗ trợ' },
];

const LegalPageShell: React.FC<LegalPageShellProps> = ({
  badge,
  title,
  subtitle,
  updatedAt = 'Cập nhật lần cuối: 11/2026',
  icon,
  sections,
  footerNote,
}) => {
  const { pathname } = useLocation();

  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div className="space-y-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                {badge}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {title}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">{subtitle}</p>
            </div>
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">{updatedAt}</span>
        </div>

        <nav
          aria-label="Điều hướng trang thông tin"
          className="pt-4 flex flex-wrap items-center gap-2"
        >
          {BUSINESS_NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-700 border border-slate-200/80'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-7">
        {sections.map((section, index) => (
          <section
            key={section.title}
            className={index > 0 ? 'pt-6 border-t border-slate-100 space-y-2.5' : 'space-y-2.5'}
          >
            <h2 className="text-base sm:text-lg font-bold text-slate-900">{section.title}</h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-2">
              {section.content}
            </div>
          </section>
        ))}

        {footerNote && (
          <div className="pt-6 border-t border-slate-100 text-xs text-slate-500">{footerNote}</div>
        )}
      </div>
    </div>
  );
};

export const AboutPage: React.FC = () => (
  <LegalPageShell
    badge="Về InnFinder"
    title="Nền tảng kết nối tìm phòng trọ & đặt lịch xem minh bạch"
    subtitle="InnFinder giúp người đi thuê tìm đúng phòng thật, đặt lịch xem có bảo chứng cọc giữ chân và kết nối trực tiếp với chủ trọ đã xác thực."
    icon={<Building2 className="w-5 h-5" />}
    sections={[
      {
        title: '1. Sứ mệnh & Giá trị cốt lõi',
        content: (
          <p>
            Thị trường thuê trọ truyền thống thường gặp tình trạng tin ảo, chênh lệch giá hoặc hủy
            hẹn phút chót. InnFinder xây dựng quy trình kiểm duyệt 100% bài đăng trước khi hiển
            thị, tích hợp bản đồ định vị thực tế, ảnh 360° và cơ chế cọc giữ chân minh bạch để bảo
            vệ quyền lợi cho cả Khách thuê và Chủ trọ.
          </p>
        ),
      },
      {
        title: '2. Điểm khác biệt của InnFinder',
        content: (
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
              <span>
                <strong>Kiểm duyệt chặt chẽ:</strong> Mọi tin phòng mới đều được Quản trị viên xét
                duyệt thông tin, hình ảnh và giá niêm yết trước khi công khai.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
              <span>
                <strong>Xác thực Chủ trọ:</strong> Tài khoản Chủ trọ bắt buộc đối chiếu CCCD 12 số
                và tài khoản ngân hàng chính chủ, gắn kèm hệ thống điểm uy tín.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
              <span>
                <strong>Tìm kiếm thông minh:</strong> Hỗ trợ lọc đa tiêu chí, tìm theo bán kính trên
                bản đồ, gợi ý ghép phòng và trợ lý AI.
              </span>
            </li>
          </ul>
        ),
      },
      {
        title: '3. Ranh giới vận hành của sàn',
        content: (
          <p>
            InnFinder là nền tảng trung gian kết nối và bảo chứng lịch hẹn xem phòng. Sàn chỉ quản
            lý khoản <strong>cọc giữ chân lịch xem</strong> và <strong>phí hoa hồng dịch vụ</strong>{' '}
            khi giao dịch thuê thành công. Tiền thuê phòng hàng tháng và tiền cọc hợp đồng thuê nhà
            do Khách thuê và Chủ trọ thỏa thuận và thanh toán trực tiếp với nhau.
          </p>
        ),
      },
    ]}
    footerNote={
      <span>
        Khám phá phòng trọ đang mở duyệt tại{' '}
        <Link to="/search" className="text-teal-700 font-semibold hover:underline">
          Trang tìm kiếm phòng
        </Link>{' '}
        hoặc xem{' '}
        <Link to="/deposit-policy" className="text-teal-700 font-semibold hover:underline">
          Chính sách cọc & hoàn tiền
        </Link>
        .
      </span>
    }
  />
);

export const TermsPage: React.FC = () => (
  <LegalPageShell
    badge="Pháp lý & Quy định"
    title="Điều khoản sử dụng dịch vụ InnFinder"
    subtitle="Bằng việc đăng ký tài khoản hoặc sử dụng các tính năng trên InnFinder, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ các điều khoản dưới đây."
    icon={<FileText className="w-5 h-5" />}
    sections={[
      {
        title: '1. Tài khoản và Bảo mật thông tin đăng nhập',
        content: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Người dùng phải cung cấp thông tin chính xác (họ tên, email, số điện thoại Việt Nam
              hợp lệ) và tự chịu trách nhiệm bảo mật mật khẩu tài khoản.
            </li>
            <li>
              Nghiêm cấm hành vi mạo danh, tạo nhiều tài khoản để thao túng đánh giá, đặt lịch ảo
              hoặc gây rối cho người dùng khác.
            </li>
          </ul>
        ),
      },
      {
        title: '2. Quyền và nghĩa vụ của Khách thuê',
        content: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Có quyền tìm kiếm, lưu phòng yêu thích, đặt lịch xem phòng và nhận lại 100% tiền cọc
              giữ chân khi đến xem phòng đúng hẹn theo quy trình.
            </li>
            <li>
              Có trách nhiệm đến xem phòng đúng thời gian đã xác nhận, xác nhận trung thực việc đã
              nhận lại cọc và quyết định thuê/không thuê trên ứng dụng.
            </li>
            <li>
              Đánh giá phòng khách quan dựa trên trải nghiệm thực tế; không sử dụng ngôn từ xúc
              phạm hoặc đăng nội dung sai sự thật.
            </li>
          </ul>
        ),
      },
      {
        title: '3. Quyền và nghĩa vụ của Chủ trọ',
        content: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Phải hoàn tất hồ sơ xác thực CCCD và tài khoản ngân hàng trước khi đăng tin phòng trọ.
            </li>
            <li>
              Cam kết hình ảnh, giá thuê, diện tích, tiền cọc hợp đồng và tiện ích phòng đăng tải
              trùng khớp thực tế.
            </li>
            <li>
              Tuân thủ lịch hẹn đã xác nhận, dẫn khách xem phòng và hoàn trả cọc giữ chân trực tiếp
              cho khách tại buổi xem. Các hành vi vắng mặt (no-show), phản hồi quá hạn hoặc gian
              lận sẽ bị trừ điểm uy tín, tạm ẩn tin hoặc khóa tài khoản tùy mức độ vi phạm.
            </li>
          </ul>
        ),
      },
      {
        title: '4. Xử lý khiếu nại và Giới hạn trách nhiệm',
        content: (
          <p>
            Khi phát sinh tranh chấp liên quan đến lịch xem phòng, thông tin sai lệch hoặc hành vi
            vi phạm, các bên có thể gửi phiếu khiếu nại kèm bằng chứng qua mục{' '}
            <Link to="/complaints" className="text-teal-700 font-semibold hover:underline">
              Khiếu nại & Hỗ trợ
            </Link>
            . Quản trị viên sẽ xác minh và áp dụng chế tài theo mức độ Nhẹ, Trung bình hoặc Nặng.
            InnFinder không chịu trách nhiệm đối với các thỏa thuận dân sự ngoài phạm vi lịch hẹn
            và cọc giữ chân trên hệ thống.
          </p>
        ),
      },
    ]}
  />
);

export const PrivacyPage: React.FC = () => (
  <LegalPageShell
    badge="Quyền riêng tư"
    title="Chính sách bảo mật dữ liệu cá nhân"
    subtitle="InnFinder cam kết bảo vệ dữ liệu cá nhân của Khách thuê và Chủ trọ, chỉ thu thập và sử dụng thông tin đúng mục đích vận hành dịch vụ."
    icon={<Lock className="w-5 h-5" />}
    sections={[
      {
        title: '1. Dữ liệu chúng tôi thu thập',
        content: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Thông tin tài khoản:</strong> Tên đăng nhập, họ và tên, email, số điện thoại,
              ảnh đại diện và mật khẩu (được mã hóa một chiều bằng BCrypt).
            </li>
            <li>
              <strong>Thông tin xác thực Chủ trọ & Thanh toán:</strong> Số CCCD, ảnh 2 mặt CCCD,
              tên ngân hàng, số tài khoản và tên chủ tài khoản phục vụ đối soát rút tiền.
            </li>
            <li>
              <strong>Dữ liệu vị trí & Giao dịch:</strong> Tọa độ bản đồ để gợi ý phòng gần bạn,
              lịch sử đặt lịch xem phòng, biến động ví và khiếu nại.
            </li>
          </ul>
        ),
      },
      {
        title: '2. Mục đích sử dụng dữ liệu',
        content: (
          <p>
            Thông tin được dùng để xác thực danh tính, kết nối lịch xem phòng giữa Khách thuê và Chủ
            trọ, xử lý đối soát cọc/rút tiền ngân hàng, gửi thông báo trạng thái và phòng chống gian
            lận trên nền tảng. InnFinder tuyệt đối không bán hoặc chia sẻ dữ liệu cá nhân cho bên
            thứ ba vì mục đích quảng cáo.
          </p>
        ),
      },
      {
        title: '3. Lưu trữ và An toàn bảo mật',
        content: (
          <p>
            Phiên đăng nhập được bảo vệ bằng JWT Stateless; hình ảnh tải lên được lưu trữ qua hạ
            tầng đám mây bảo mật. Người dùng có quyền xem, cập nhật hồ sơ cá nhân hoặc liên hệ bộ
            phận hỗ trợ để yêu cầu kiểm tra, điều chỉnh dữ liệu tài khoản của mình.
          </p>
        ),
      },
    ]}
  />
);

export const DepositPolicyPage: React.FC = () => (
  <LegalPageShell
    badge="Tài chính minh bạch"
    title="Chính sách cọc giữ chân, Hoàn cọc & Hoa hồng"
    subtitle="Cơ chế thế chân cọc giúp chống đặt lịch ảo, đảm bảo Khách thuê được xem đúng phòng và Chủ trọ chỉ trả phí hoa hồng khi giao dịch thuê thành công."
    icon={<Wallet className="w-5 h-5" />}
    sections={[
      {
        title: '1. Bản chất khoản cọc giữ chân xem phòng',
        content: (
          <p>
            Mức cọc giữ chân được quy định theo từng loại phòng (ví dụ: Ký túc xá/Sleepbox, Phòng
            trọ khép kín, Chung cư mini/Studio). Khi đặt lịch, Khách thuê nộp khoản cọc này để hệ
            thống tạm giữ, xác nhận thiện chí đến xem phòng đúng hẹn.
          </p>
        ),
      },
      {
        title: '2. Quy trình hoàn cọc và quyết toán sau buổi xem',
        content: (
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Chủ trọ xác nhận lịch:</strong> Lịch hẹn chuyển sang trạng thái đã xác nhận và
              hiển thị thông tin gặp mặt.
            </li>
            <li>
              <strong>Hoàn cọc trực tiếp tại buổi xem:</strong> Khi gặp mặt dẫn xem phòng thực tế,
              Chủ trọ hoàn trả trực tiếp 100% tiền cọc giữ chân cho Khách thuê; Khách thuê xác nhận{' '}
              <em>&ldquo;Đã nhận lại cọc&rdquo;</em> trên ứng dụng.
            </li>
            <li>
              <strong>Hai bên chốt kết quả độc lập:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>
                  <strong>Cả 2 bên xác nhận thuê:</strong> Hệ thống trích phí hoa hồng sàn theo loại
                  phòng và chuyển phần còn lại <code>(Cọc - Hoa hồng)</code> vào ví Chủ trọ. Phòng
                  chuyển sang trạng thái đã hoàn tất.
                </li>
                <li>
                  <strong>Có ít nhất 1 bên chọn không thuê:</strong> Hệ thống hoàn đủ 100% tiền cọc
                  vào ví Chủ trọ (phí hoa hồng = 0đ), lịch hẹn chuyển trạng thái hủy và phòng tiếp
                  tục mở tìm khách khác.
                </li>
              </ul>
            </li>
          </ol>
        ),
      },
      {
        title: '3. Rút tiền từ ví về tài khoản ngân hàng',
        content: (
          <p>
            Chủ trọ có số dư khả dụng trong ví và đã liên kết tài khoản ngân hàng chính chủ có thể
            tạo yêu cầu rút tiền bất kỳ lúc nào. Hệ thống ghi nhận giao dịch ở trạng thái chờ thanh
            toán để bộ phận tài chính đối soát và giải ngân.
          </p>
        ),
      },
    ]}
  />
);

export const ContactPage: React.FC = () => (
  <LegalPageShell
    badge="Hỗ trợ khách hàng"
    title="Liên hệ & Trung tâm hỗ trợ InnFinder"
    subtitle="Đội ngũ vận hành InnFinder sẵn sàng hỗ trợ giải đáp thắc mắc về đặt lịch, đối soát cọc, duyệt tin và xử lý khiếu nại."
    icon={<Headphones className="w-5 h-5" />}
    sections={[
      {
        title: '1. Kênh liên hệ chính thức',
        content: (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <Headphones className="w-4 h-4 text-teal-600" />
                <span>Tổng đài hỗ trợ</span>
              </div>
              <p className="text-base font-bold text-teal-700 tabular-nums">1900 6868</p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                08:00 – 22:00 hàng ngày (kể cả cuối tuần)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <Mail className="w-4 h-4 text-teal-600" />
                <span>Email & Văn phòng</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">hotro@innfinder.vn</p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                TP. Hồ Chí Minh, Việt Nam
              </p>
            </div>
          </div>
        ),
      },
      {
        title: '2. Gửi khiếu nại hoặc báo cáo vi phạm',
        content: (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-teal-50/60 border border-teal-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-teal-900 font-semibold">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>Xử lý tranh chấp cọc, phòng sai mô tả hoặc vắng mặt</span>
              </div>
              <p className="text-xs text-teal-800/80">
                Vui lòng gửi kèm ảnh chụp màn hình hoặc bằng chứng để Quản trị viên xác minh nhanh
                nhất.
              </p>
            </div>
            <Link
              to="/complaints"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shrink-0"
            >
              Tạo phiếu khiếu nại
            </Link>
          </div>
        ),
      },
    ]}
  />
);

export const LANDLORD_POLICY_SECTIONS: BusinessSection[] = [
  {
    title: '1. Điểm uy tín khởi tạo & Phân hạng Chủ trọ',
    content: (
      <div className="space-y-2">
        <p>
          Khi hồ sơ Chủ trọ được duyệt, tài khoản được khởi tạo mặc định <strong>100 điểm uy tín</strong>{' '}
          (thang điểm từ <code>0</code> đến <code>100</code>). Hệ thống tự động áp dụng ngưỡng
          phân hạng và chế tài theo điểm số hiện tại:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>90 – 100 điểm:</strong> Chủ trọ Uy tín Cao (ưu tiên hiển thị và huy hiệu uy tín).
          </li>
          <li>
            <strong>81 – 89 điểm:</strong> Chủ trọ Tiêu chuẩn (Tốt).
          </li>
          <li>
            <strong>70 – 80 điểm:</strong> Chủ trọ Tiêu chuẩn (mất nhãn đề xuất nổi bật).
          </li>
          <li>
            <strong>50 – 69 điểm:</strong> Hạn chế hiển thị (tối đa <strong>3 phòng</strong> hoạt động).
          </li>
          <li>
            <strong>30 – 49 điểm:</strong> Đình chỉ đăng tin phòng mới cho đến khi phục hồi điểm.
          </li>
          <li>
            <strong>Dưới 30 điểm:</strong> Hệ thống tự động khóa tài khoản do uy tín quá thấp.
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: '2. Các hành vi vi phạm & Mức trừ điểm tự động',
    content: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Quá hạn phản hồi lịch hẹn:</strong> Trừ <strong>3 điểm</strong> cho mỗi lịch hẹn
          không xác nhận hoặc từ chối đúng thời hạn quy định.
        </li>
        <li>
          <strong>Hủy lịch hẹn sau khi đã xác nhận:</strong> Trừ <strong>5 điểm</strong> khi Chủ trọ
          tự ý hủy lịch đã chốt với Khách thuê.
        </li>
        <li>
          <strong>Vắng mặt tại buổi xem phòng (No-show):</strong> Trừ <strong>10 điểm</strong> cho
          mỗi lần bị xác nhận vắng mặt. Nếu vi phạm <strong>quá 2 lần trong vòng 30 ngày</strong>,
          hệ thống tự động <strong>tạm ẩn toàn bộ bài đăng trong 7 ngày</strong>.
        </li>
      </ul>
    ),
  },
  {
    title: '3. Xử lý khiếu nại & Chế tài theo mức độ vi phạm',
    content: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Mức độ Nhẹ:</strong> Cảnh cáo nhắc nhở qua hệ thống; nếu cộng dồn nhiều lần vi
          phạm nhẹ sẽ bị trừ thêm <strong>5 điểm</strong>.
        </li>
        <li>
          <strong>Mức độ Trung bình:</strong> Trừ <strong>10 điểm uy tín</strong> và{' '}
          <strong>tạm ẩn toàn bộ bài đăng 7 ngày</strong>.
        </li>
        <li>
          <strong>Mức độ Nặng (gian lận, thu tiền sai quy định, lừa đảo):</strong> Khóa tài khoản
          vĩnh viễn, tịch thu khoản cọc liên quan để hoàn trả và bảo vệ Khách thuê bị hại.
        </li>
      </ul>
    ),
  },
  {
    title: '4. Cơ chế phục hồi & Tích lũy điểm uy tín',
    content: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Hoàn tất giao dịch thuê thành công:</strong> Cộng <strong>+3 điểm</strong> cho mỗi
          phiếu đặt lịch hoàn thành hợp lệ.
        </li>
        <li>
          <strong>Nhận đánh giá tích cực từ Khách thuê:</strong> Cộng <strong>+2 điểm</strong> với
          đánh giá 5 sao và <strong>+1 điểm</strong> với đánh giá 4 sao (tối đa{' '}
          <strong>+10 điểm trong 30 ngày</strong>).
        </li>
        <li>
          <strong>Chuỗi hoạt động sạch 30 ngày:</strong> Cộng thưởng <strong>+5 điểm</strong> khi
          duy trì 30 ngày liên tiếp không phát sinh vi phạm hoặc khiếu nại hợp lệ.
        </li>
      </ul>
    ),
  },
];

export const LandlordPolicyPage: React.FC = () => (
  <LegalPageShell
    badge="Quy chuẩn Chủ trọ"
    title="Chính sách Uy tín & Xử phạt Chủ trọ"
    subtitle="Quy định minh bạch về thang điểm uy tín, chế tài xử lý vi phạm lịch hẹn/khiếu nại và cơ chế phục hồi điểm dành cho Chủ trọ trên InnFinder."
    icon={<ShieldCheck className="w-5 h-5" />}
    sections={LANDLORD_POLICY_SECTIONS}
    footerNote={
      <span>
        Để đăng ký trở thành Chủ trọ, vui lòng truy cập{' '}
        <Link to="/profile" className="text-teal-700 font-semibold hover:underline">
          Hồ sơ cá nhân
        </Link>{' '}
        và hoàn tất xác thực CCCD kèm tài khoản ngân hàng chính chủ.
      </span>
    }
  />
);
