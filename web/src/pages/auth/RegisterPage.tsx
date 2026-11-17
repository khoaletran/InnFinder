import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  Mail,
  Phone,
  Lock,
  CreditCard,
  Building,
  Upload,
  CheckCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { registerSchema } from '../../utils/validators';
import { authUserService } from '../../services/authUser.service';
import { uploadService } from '../../services/upload.service';
import { VIETNAM_BANKS } from '../../constants/banks';
import { toast } from 'sonner';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLandlord, setIsLandlord] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [frontCccdUrl, setFrontCccdUrl] = useState<string>('');
  const [backCccdUrl, setBackCccdUrl] = useState<string>('');

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      tenDangNhap: '',
      hoVaTen: '',
      email: '',
      sdt: '',
      matKhau: '',
      xacNhanMatKhau: '',
      chuTro: false,
      cccd: '',
      anhCccdTruoc: '',
      anhCccdSau: '',
      tenNganHang: 'Vietcombank',
      soTaiKhoan: '',
      tenChuTaiKhoan: '',
    },
  });

  const handleToggleLandlord = (checked: boolean) => {
    setIsLandlord(checked);
    setValue('chuTro', checked);
  };

  const handleUploadCccd = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (side === 'front') {
        setUploadingFront(true);
        const url = await uploadService.uploadImage(file, 'cccd');
        setFrontCccdUrl(url);
        setValue('anhCccdTruoc', url);
        toast.success('Tải ảnh mặt trước CCCD thành công');
      } else {
        setUploadingBack(true);
        const url = await uploadService.uploadImage(file, 'cccd');
        setBackCccdUrl(url);
        setValue('anhCccdSau', url);
        toast.success('Tải ảnh mặt sau CCCD thành công');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải ảnh lên Cloudinary');
    } finally {
      if (side === 'front') setUploadingFront(false);
      else setUploadingBack(false);
    }
  };

  const handleNextStep = async () => {
    const valid = await trigger([
      'tenDangNhap',
      'hoVaTen',
      'email',
      'sdt',
      'matKhau',
      'xacNhanMatKhau',
    ]);
    if (valid) {
      if (isLandlord) {
        setCurrentStep(2);
      } else {
        handleSubmit(onSubmit)();
      }
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      const payload = {
        tenDangNhap: data.tenDangNhap,
        hoVaTen: data.hoVaTen,
        matKhau: data.matKhau,
        xacNhanMatKhau: data.xacNhanMatKhau,
        email: data.email,
        sdt: data.sdt,
        cccd: data.cccd || undefined,
        chuTro: data.chuTro,
      };

      await authUserService.register(payload);

      // Nếu đăng ký chủ trọ, nộp thêm đơn xác thực
      if (data.chuTro) {
        try {
          // Tự động đăng nhập để lấy token gửi yêu cầu nâng cấp nếu cần
          const loginRes = await authUserService.login({
            tenDangNhap: data.tenDangNhap,
            matKhau: data.matKhau,
          });
          localStorage.setItem('innfinder_jwt_token', loginRes.token);

          await authUserService.upgradeToLandlord({
            cccd: data.cccd,
            anhCccdTruoc: data.anhCccdTruoc,
            anhCccdSau: data.anhCccdSau,
            tenNganHang: data.tenNganHang,
            soTaiKhoan: data.soTaiKhoan,
            tenChuTaiKhoan: data.tenChuTaiKhoan.toUpperCase(),
          });
          toast.success('Đăng ký tài khoản và gửi hồ sơ Chủ trọ thành công!');
        } catch {
          toast.success('Đăng ký tài khoản thành công! Hồ sơ chủ trọ có thể bổ sung sau.');
        }
      } else {
        toast.success('Tạo tài khoản thành công! Vui lòng đăng nhập.');
      }

      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Đăng ký thất bại, vui lòng kiểm tra lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            {isLandlord ? `Bước ${currentStep}/2: ${currentStep === 1 ? 'Thông tin cơ bản' : 'Xác thực Chủ trọ'}` : 'Đăng ký Khách thuê'}
          </span>
          <Link to="/login" className="text-xs text-slate-500 hover:text-slate-800">
            Đã có tài khoản? <strong className="text-blue-600">Đăng nhập</strong>
          </Link>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tạo tài khoản mới</h2>
        <p className="text-xs text-slate-500 mt-1">
          Bắt đầu hành trình thuê trọ minh bạch hoặc đăng tin cho thuê chuyên nghiệp
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {currentStep === 1 ? (
          <>
            {/* Tên đăng nhập & Họ tên */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="VD: tran_khoa"
                    {...register('tenDangNhap')}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  />
                </div>
                {errors.tenDangNhap && (
                  <p className="text-[10px] text-red-500 mt-0.5">
                    {errors.tenDangNhap.message as string}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên đầy đủ
                </label>
                <input
                  type="text"
                  placeholder="VD: Trần Lê Khoa"
                  {...register('hoVaTen')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
                {errors.hoVaTen && (
                  <p className="text-[10px] text-red-500 mt-0.5">
                    {errors.hoVaTen.message as string}
                  </p>
                )}
              </div>
            </div>

            {/* Email & SĐT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    {...register('email')}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="text-[10px] text-red-500 mt-0.5">{errors.email.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="VD: 0912345678"
                    {...register('sdt')}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  />
                </div>
                {errors.sdt && (
                  <p className="text-[10px] text-red-500 mt-0.5">{errors.sdt.message as string}</p>
                )}
              </div>
            </div>

            {/* Mật khẩu & Nhập lại */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Tối thiểu 8 ký tự"
                    {...register('matKhau')}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  />
                </div>
                {errors.matKhau && (
                  <p className="text-[10px] text-red-500 mt-0.5">{errors.matKhau.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  {...register('xacNhanMatKhau')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
                {errors.xacNhanMatKhau && (
                  <p className="text-[10px] text-red-500 mt-0.5">
                    {errors.xacNhanMatKhau.message as string}
                  </p>
                )}
              </div>
            </div>

            {/* Switch Chủ trọ */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  Đăng ký làm Chủ trọ cho thuê
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Mở quyền đăng tin, quản lý lịch xem và nhận cọc qua sàn
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLandlord}
                  onChange={(e) => handleToggleLandlord(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>

            {/* Next or Submit Button */}
            {isLandlord ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                Tiếp tục: Điền thông tin Chủ trọ
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tạo tài khoản...
                  </>
                ) : (
                  <>Hoàn tất đăng ký</>
                )}
              </button>
            )}
          </>
        ) : (
          /* Step 2: Landlord Identity & Banking */
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                Chính sách bảo mật: Thông tin CCCD và số tài khoản chỉ sử dụng để đối soát dòng tiền và kích hoạt quyền đăng bài.
              </p>
            </div>

            {/* CCCD Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số Căn cước công dân (12 số)
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={12}
                  placeholder="VD: 079203001234"
                  {...register('cccd')}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
              {errors.cccd && (
                <p className="text-[10px] text-red-500 mt-0.5">{errors.cccd.message as string}</p>
              )}
            </div>

            {/* 2 Ảnh CCCD */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Ảnh mặt trước CCCD
                </label>
                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer bg-slate-50/50 overflow-hidden relative">
                  {frontCccdUrl ? (
                    <img src={frontCccdUrl} alt="CCCD Trước" className="w-full h-full object-cover" />
                  ) : uploadingFront ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  ) : (
                    <div className="text-center p-2">
                      <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                      <span className="text-[10px] text-slate-500">Tải ảnh mặt trước</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadCccd(e, 'front')}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Ảnh mặt sau CCCD
                </label>
                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer bg-slate-50/50 overflow-hidden relative">
                  {backCccdUrl ? (
                    <img src={backCccdUrl} alt="CCCD Sau" className="w-full h-full object-cover" />
                  ) : uploadingBack ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  ) : (
                    <div className="text-center p-2">
                      <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                      <span className="text-[10px] text-slate-500">Tải ảnh mặt sau</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadCccd(e, 'back')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Ngân hàng */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Ngân hàng
                </label>
                <select
                  {...register('tenNganHang')}
                  className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none"
                >
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b.code} value={b.shortName}>
                      {b.shortName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Số tài khoản
                </label>
                <input
                  type="text"
                  placeholder="Số tài khoản ngân hàng"
                  {...register('soTaiKhoan')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Tên chủ tài khoản (In hoa không dấu)
              </label>
              <input
                type="text"
                placeholder="VD: TRAN LE KHOA"
                {...register('tenChuTaiKhoan')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase bg-slate-50/50 focus:bg-white focus:outline-none"
              />
              {errors.soTaiKhoan && (
                <p className="text-[10px] text-red-500 mt-0.5">
                  {errors.soTaiKhoan.message as string}
                </p>
              )}
            </div>

            {/* Actions for Step 2 */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-1/3 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang lưu hồ sơ...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Tạo tài khoản Chủ trọ
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
