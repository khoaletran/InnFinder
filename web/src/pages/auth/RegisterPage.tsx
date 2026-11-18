import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Card, Chip, Spinner } from '@heroui/react';
import {
  User,
  Mail,
  Phone,
  Lock,
  CreditCard,
  Building,
  Upload,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { tokenStorage } from '@/api/axiosClient';
import { registerSchema } from '@/utils/validators';
import { authUserService } from '@/services/authUser.service';
import { uploadService } from '@/services/upload.service';
import { VIETNAM_BANKS } from '@/constants/banks';
import { useAuthStore } from '@/store/useAuthStore';

type RegisterFormInput = z.input<typeof registerSchema>;
type RegisterFormOutput = z.output<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
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
  } = useForm<RegisterFormInput, unknown, RegisterFormOutput>({
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
      tenNganHang: VIETNAM_BANKS[0]?.shortName ?? 'Vietcombank',
      soTaiKhoan: '',
      tenChuTaiKhoan: '',
    },
  });

  const handleToggleLandlord = (checked: boolean) => {
    setIsLandlord(checked);
    setValue('chuTro', checked, { shouldValidate: false });
  };

  const handleUploadCccd = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (side === 'front') {
        setUploadingFront(true);
        const url = await uploadService.uploadImage(file, 'cccd');
        setFrontCccdUrl(url);
        setValue('anhCccdTruoc', url, { shouldValidate: true });
        toast.success('Tải ảnh mặt trước CCCD thành công');
      } else {
        setUploadingBack(true);
        const url = await uploadService.uploadImage(file, 'cccd');
        setBackCccdUrl(url);
        setValue('anhCccdSau', url, { shouldValidate: true });
        toast.success('Tải ảnh mặt sau CCCD thành công');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tải ảnh lên Cloudinary';
      toast.error(msg);
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
        void handleSubmit(onSubmit)();
      }
    }
  };

  const onSubmit = async (data: RegisterFormOutput) => {
    try {
      setIsLoading(true);

      await authUserService.register({
        tenDangNhap: data.tenDangNhap,
        hoVaTen: data.hoVaTen,
        matKhau: data.matKhau,
        xacNhanMatKhau: data.xacNhanMatKhau,
        email: data.email,
        sdt: data.sdt,
        cccd: data.cccd || undefined,
        chuTro: data.chuTro,
      });

      if (data.chuTro) {
        try {
          const loginRes = await authUserService.login({
            tenDangNhap: data.tenDangNhap,
            matKhau: data.matKhau,
          });
          tokenStorage.saveToken(loginRes.token);

          await authUserService.upgradeToLandlord({
            cccd: (data.cccd || '').trim(),
            anhCccdTruoc: data.anhCccdTruoc || '',
            anhCccdSau: data.anhCccdSau || '',
            tenNganHang: (data.tenNganHang || 'Vietcombank').trim(),
            soTaiKhoan: (data.soTaiKhoan || '').trim(),
            tenChuTaiKhoan: (data.tenChuTaiKhoan || data.hoVaTen).trim().toUpperCase(),
          });

          const profile = await authUserService.getMyProfile();
          setAuth(loginRes.token, profile);

          toast.success('Đăng ký tài khoản và gửi hồ sơ Chủ trọ thành công!');
          navigate('/profile', { replace: true });
          return;
        } catch {
          // Dọn sạch token tạm để không bị lệch trạng thái với useAuthStore
          tokenStorage.removeToken();
          toast.success('Đăng ký tài khoản thành công! Vui lòng đăng nhập để bổ sung hồ sơ Chủ trọ.');
          navigate('/login', { replace: true });
          return;
        }
      }

      toast.success('Tạo tài khoản thành công! Vui lòng đăng nhập.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng ký thất bại, vui lòng kiểm tra lại';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent p-0">
      <Card.Header className="px-0 pt-0 pb-5">
        <div className="w-full flex items-center justify-between mb-2">
          <Chip size="sm" variant="soft" color="accent" className="font-bold">
            {isLandlord
              ? `Bước ${currentStep}/2: ${currentStep === 1 ? 'Thông tin cơ bản' : 'Xác thực Chủ trọ'}`
              : 'Đăng ký Khách thuê'}
          </Chip>
          <Link to="/login" className="text-xs text-slate-500 hover:text-slate-800">
            Đã có tài khoản? <strong className="text-blue-600">Đăng nhập</strong>
          </Link>
        </div>
        <Card.Title className="text-2xl font-bold text-slate-900 tracking-tight">
          Tạo tài khoản mới
        </Card.Title>
        <Card.Description className="text-xs text-slate-500 mt-1">
          Bắt đầu hành trình thuê trọ minh bạch hoặc đăng tin cho thuê chuyên nghiệp
        </Card.Description>
      </Card.Header>

      <Card.Content className="px-0 py-0">
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
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.tenDangNhap.message}</p>
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
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.hoVaTen.message}</p>
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
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.email.message}</p>
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
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.sdt.message}</p>
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
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.matKhau.message}</p>
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
                      {errors.xacNhanMatKhau.message}
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
                      <Spinner size="sm" color="current" />
                      <span>Đang tạo tài khoản...</span>
                    </>
                  ) : (
                    <span>Hoàn tất đăng ký</span>
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
                  Chính sách bảo mật: Thông tin CCCD (12 chữ số) và tài khoản ngân hàng chỉ sử dụng để đối soát dòng tiền và kích hoạt quyền đăng bài.
                </p>
              </div>

              {/* CCCD Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số Căn cước công dân (đúng 12 chữ số)
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
                  <p className="text-[10px] text-red-500 mt-0.5">{errors.cccd.message}</p>
                )}
              </div>

              {/* 2 Ảnh CCCD */}
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ảnh mặt trước CCCD *
                    </label>
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer bg-slate-50/50 overflow-hidden relative">
                      {frontCccdUrl ? (
                        <img
                          src={frontCccdUrl}
                          alt="CCCD Trước"
                          className="w-full h-full object-cover"
                        />
                      ) : uploadingFront ? (
                        <Spinner size="sm" />
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
                      Ảnh mặt sau CCCD *
                    </label>
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer bg-slate-50/50 overflow-hidden relative">
                      {backCccdUrl ? (
                        <img
                          src={backCccdUrl}
                          alt="CCCD Sau"
                          className="w-full h-full object-cover"
                        />
                      ) : uploadingBack ? (
                        <Spinner size="sm" />
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
                {(errors.anhCccdTruoc || errors.anhCccdSau) && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.anhCccdTruoc?.message || errors.anhCccdSau?.message}
                  </p>
                )}
              </div>

              {/* Ngân hàng (giá trị dùng bank.shortName chỉ chứa chữ cái/khoảng trắng khớp REGEX_PATTERNS.BANK_NAME) */}
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
                    Số tài khoản (6 - 20 chữ số)
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="VD: 1029384756"
                    {...register('soTaiKhoan')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
              {errors.soTaiKhoan && (
                <p className="text-[10px] text-red-500 -mt-2">{errors.soTaiKhoan.message}</p>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tên chủ tài khoản (In hoa đối chiếu CCCD)
                </label>
                <input
                  type="text"
                  placeholder="VD: TRAN LE KHOA"
                  {...register('tenChuTaiKhoan')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase bg-slate-50/50 focus:bg-white focus:outline-none"
                />
                {(errors.tenNganHang || errors.tenChuTaiKhoan) && (
                  <p className="text-[10px] text-red-500 mt-0.5">
                    {errors.tenNganHang?.message || errors.tenChuTaiKhoan?.message}
                  </p>
                )}
              </div>

              {/* Actions for Step 2 */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-1/3 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isLoading || uploadingFront || uploadingBack}
                  className="w-2/3 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" color="current" />
                      <span>Đang lưu hồ sơ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Tạo tài khoản Chủ trọ</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </Card.Content>
    </Card>
  );
};
