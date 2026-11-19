import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Card, Spinner } from '@heroui/react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { tokenStorage } from '@/api/axiosClient';
import { authUserService } from '@/services/authUser.service';
import { useAuthStore } from '@/store/useAuthStore';
import { loginSchema, registerSchema } from '@/utils/validators';
import type { LoginRequest } from '@/types/auth-user.types';
import { InnFinderPinIcon } from '@/components/common/InnFinderLogo';

export type AuthMode = 'login' | 'register';

interface AuthMapPortalProps {
  initialMode?: AuthMode;
}

interface LocationRedirectState {
  from?: {
    pathname?: string;
  };
}

type RegisterFormInput = z.input<typeof registerSchema>;
type RegisterFormOutput = z.output<typeof registerSchema>;

const MAP_WIDTH = 300;
const MAP_HEIGHT = 290;
const COMPACT_MAP_HEIGHT = 330;
const LOGIN_POS = { x: 64, y: 205 };
const REGISTER_POS = { x: 236, y: 86 };

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const AuthMapPortal: React.FC<AuthMapPortalProps> = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [targetLabel, setTargetLabel] = useState<AuthMode>(initialMode);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [wordmarkCollapsed, setWordmarkCollapsed] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [boxHeight, setBoxHeight] = useState<number | 'auto'>('auto');
  const [rippleActive, setRippleActive] = useState(false);

  const isAnimatingRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const formWrapperRef = useRef<HTMLDivElement | null>(null);
  const jumpingPinRef = useRef<HTMLDivElement | null>(null);
  const pinShadowRef = useRef<HTMLDivElement | null>(null);

  // ================= LOGIN STATE =================
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    setValue: setLoginValue,
    formState: { errors: loginErrors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: { tenDangNhap: '', matKhau: '' },
  });

  // ================= REGISTER STATE =================
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirmPass, setShowRegConfirmPass] = useState(false);

  const {
    register: registerSignUp,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: regErrors },
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
    },
  });

  useEffect(() => {
    setMode(initialMode);
    setTargetLabel(initialMode);
  }, [initialMode]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const setPinTransform = (progress: number, arcLift: number, tiltDeg: number) => {
    const x = LOGIN_POS.x + (REGISTER_POS.x - LOGIN_POS.x) * progress;
    const y = LOGIN_POS.y + (REGISTER_POS.y - LOGIN_POS.y) * progress;
    const scaleBounce = 1 + 0.22 * arcLift;
    const liftPx = -72 * arcLift;

    if (jumpingPinRef.current) {
      jumpingPinRef.current.style.transform = `translate3d(${x - 24}px, ${y - 46 + liftPx}px, 0) scale(${scaleBounce}) rotate(${tiltDeg}deg)`;
    }
    if (pinShadowRef.current) {
      const shadowScale = 1 - 0.62 * arcLift;
      const shadowOpacity = 0.32 - 0.22 * arcLift;
      pinShadowRef.current.style.opacity = String(shadowOpacity);
      pinShadowRef.current.style.transform = `translate3d(${x - 13}px, ${y - 5}px, 0) scale(${shadowScale}, ${shadowScale * 0.55})`;
    }
  };

  const triggerSwitchMode = (nextMode: AuthMode) => {
    if (isAnimatingRef.current || nextMode === mode) return;
    isAnimatingRef.current = true;
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const startHeight = formWrapperRef.current?.offsetHeight || COMPACT_MAP_HEIGHT;
    const fromProgress = mode === 'login' ? 0 : 1;
    const toProgress = nextMode === 'register' ? 1 : 0;
    const tiltDir = nextMode === 'register' ? 1 : -1;

    setTargetLabel(nextMode);
    setIsTransitioning(true);
    setRippleActive(false);
    setBoxHeight(startHeight);

    // Bước 1: Thu gọn chữ "InnFinder" vào Pin & thu khung về kích thước bản đồ
    setWordmarkCollapsed(true);
    const shrinkDelay = mode === 'register' ? 140 : 0;

    timersRef.current.push(
      window.setTimeout(() => {
        setBoxHeight(COMPACT_MAP_HEIGHT);
      }, 20)
    );

    // Bước 2: Hiện lớp Bản đồ hành trình 2 trạm
    timersRef.current.push(
      window.setTimeout(() => {
        setPinTransform(fromProgress, 0, 0);
        setMapVisible(true);
      }, 150 + shrinkDelay)
    );

    // Bước 3: Pin nhảy vòng cung Parabol từ trạm cũ sang trạm đích (540ms)
    const jumpStartDelay = 360 + shrinkDelay;
    const jumpDuration = 540;

    timersRef.current.push(
      window.setTimeout(() => {
        const startTime = performance.now();
        const step = (now: number) => {
          const raw = Math.min((now - startTime) / jumpDuration, 1);
          const eased = easeInOutCubic(raw);
          const progress = fromProgress + (toProgress - fromProgress) * eased;
          const arcLift = Math.sin(Math.PI * raw);
          const tiltDeg = Math.sin(Math.PI * raw * 1.4) * 14 * tiltDir;

          setPinTransform(progress, arcLift, tiltDeg);

          if (raw < 1) {
            rafRef.current = requestAnimationFrame(step);
          } else {
            setPinTransform(toProgress, 0, 0);
          }
        };
        rafRef.current = requestAnimationFrame(step);
      }, jumpStartDelay)
    );

    // Sóng lan tỏa (Ripple) khi Pin chạm đất
    timersRef.current.push(
      window.setTimeout(() => {
        setRippleActive(true);
      }, jumpStartDelay + 450)
    );

    // Đổi form ở hậu cảnh ngay khi Pin đáp xuống
    timersRef.current.push(
      window.setTimeout(() => {
        setMode(nextMode);
        window.history.replaceState(null, '', nextMode === 'register' ? '/register' : '/login');
      }, jumpStartDelay + 500)
    );

    // Bước 4: Mở rộng lại form mới, ẩn bản đồ, bung chữ "InnFinder"
    const unfoldDelay = jumpStartDelay + 700;
    timersRef.current.push(
      window.setTimeout(() => {
        const nextMeasured = formWrapperRef.current?.scrollHeight || COMPACT_MAP_HEIGHT;
        setBoxHeight(nextMeasured);
        setMapVisible(false);
      }, unfoldDelay)
    );

    timersRef.current.push(
      window.setTimeout(() => {
        setWordmarkCollapsed(false);
      }, unfoldDelay + 120)
    );

    timersRef.current.push(
      window.setTimeout(() => {
        setBoxHeight('auto');
        setIsTransitioning(false);
        setRippleActive(false);
        isAnimatingRef.current = false;
      }, unfoldDelay + 420)
    );
  };

  // ================= LOGIN HANDLER =================
  const onSubmitLogin = async (data: LoginRequest) => {
    try {
      setLoginLoading(true);
      const res = await authUserService.login(data);
      tokenStorage.saveToken(res.token);
      const profile = await authUserService.getMyProfile();
      setAuth(res.token, profile);

      toast.success(`Chào mừng trở lại, ${profile.hoVaTen || profile.tenDangNhap}!`);
      const rawFrom = (location.state as LocationRedirectState | null)?.from?.pathname;

      if (profile.vaiTro === 'QUAN_TRI') {
        navigate('/admin/dashboard', { replace: true });
      } else if (profile.chuTro) {
        const safeFrom =
          rawFrom && !rawFrom.startsWith('/admin') ? rawFrom : '/landlord/dashboard';
        navigate(safeFrom, { replace: true });
      } else {
        const safeFrom =
          rawFrom && !rawFrom.startsWith('/admin') && !rawFrom.startsWith('/landlord')
            ? rawFrom
            : '/';
        navigate(safeFrom, { replace: true, state: { openLeftTab: true } });
      }
    } catch (err: unknown) {
      tokenStorage.removeToken();
      const message =
        err instanceof Error ? err.message : 'Tên đăng nhập hoặc mật khẩu không chính xác';
      toast.error(message);
    } finally {
      setLoginLoading(false);
    }
  };

  // ================= REGISTER HANDLER =================
  const onSubmitRegister = async (data: RegisterFormOutput) => {
    try {
      setRegLoading(true);

      await authUserService.register({
        tenDangNhap: data.tenDangNhap,
        hoVaTen: data.hoVaTen,
        matKhau: data.matKhau,
        xacNhanMatKhau: data.xacNhanMatKhau,
        email: data.email,
        sdt: data.sdt,
        chuTro: false,
      });

      toast.success('Tạo tài khoản thành công! Đang chuyển về trạm Đăng nhập.');
      setLoginValue('tenDangNhap', data.tenDangNhap);
      triggerSwitchMode('login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng ký thất bại, vui lòng kiểm tra lại';
      toast.error(msg);
    } finally {
      setRegLoading(false);
    }
  };

  const ripplePos = targetLabel === 'register' ? REGISTER_POS : LOGIN_POS;

  return (
    <div className="w-full">
      {/* ================= HEADER LOGO ĐỘNG (PIN VECTOR + CHỮ INNFINDER) ================= */}
      <div className="flex flex-col items-center mb-5">
        <div className="flex items-center justify-center h-12">
          <div
            className="z-10 transition-all duration-300"
            style={{
              opacity: mapVisible ? 0 : 1,
              transform: mapVisible
                ? 'translateY(20px) scale(0.85)'
                : wordmarkCollapsed
                ? 'scale(1.16)'
                : 'scale(1)',
            }}
          >
            <InnFinderPinIcon size={42} />
          </div>

          <div
            className="overflow-hidden flex items-center transition-all duration-300 ease-out"
            style={{
              maxWidth: wordmarkCollapsed ? 0 : 165,
              opacity: wordmarkCollapsed ? 0 : 1,
              paddingLeft: wordmarkCollapsed ? 0 : 6,
              transform: wordmarkCollapsed
                ? 'translateX(-24px) scale(0.3)'
                : 'translateX(0) scale(1)',
            }}
          >
            <span
              className="text-2xl font-extrabold tracking-tight whitespace-nowrap select-none"
              style={{ color: '#118A7E' }}
            >
              InnFinder
            </span>
          </div>
        </div>

        <p className="text-xs font-medium text-slate-500 mt-1 text-center">
          {isTransitioning
            ? targetLabel === 'register'
              ? 'Đang di chuyển tới Trạm Đăng Ký...'
              : 'Đang thu gọn & quay về Trạm Đăng Nhập...'
            : mode === 'login'
            ? 'Tìm phòng trọ minh bạch & an toàn'
            : 'Khởi tạo hành trình tìm phòng mới'}
        </p>
      </div>

      {/* ================= KHUNG CHÍNH (FORM <-> BẢN ĐỒ HÀNH TRÌNH) ================= */}
      <div
        className="relative overflow-hidden transition-[height] duration-350 ease-in-out"
        style={{
          height: boxHeight === 'auto' ? 'auto' : `${boxHeight}px`,
        }}
      >
        {/* LỚP 1: FORM ĐĂNG NHẬP / ĐĂNG KÝ */}
        <div
          ref={formWrapperRef}
          className={`transition-all duration-250 ease-out ${
            mapVisible ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
          }`}
        >
          {mode === 'login' ? (
            <Card className="w-full border-none shadow-none bg-transparent p-0">
              <Card.Content className="px-0 py-0">
                <form onSubmit={handleLoginSubmit(onSubmitLogin)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Tên đăng nhập hoặc Email
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Tên tài khoản hoặc email"
                        {...registerLogin('tenDangNhap')}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 transition-all ${
                          loginErrors.tenDangNhap
                            ? 'border-red-300 focus:ring-red-200 bg-red-50/30'
                            : 'border-slate-200 focus:ring-teal-100 focus:border-teal-600 bg-slate-50/50 focus:bg-white'
                        }`}
                      />
                    </div>
                    {loginErrors.tenDangNhap && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">
                        {loginErrors.tenDangNhap.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">Mật khẩu</label>
                      <Link
                        to="/forgot-password"
                        className="text-[11px] text-teal-600 hover:text-teal-700 font-semibold hover:underline"
                      >
                        Quên mật khẩu?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showLoginPass ? 'text' : 'password'}
                        placeholder="Tối thiểu 8 ký tự"
                        {...registerLogin('matKhau')}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 transition-all ${
                          loginErrors.matKhau
                            ? 'border-red-300 focus:ring-red-200 bg-red-50/30'
                            : 'border-slate-200 focus:ring-teal-100 focus:border-teal-600 bg-slate-50/50 focus:bg-white'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPass(!showLoginPass)}
                        className="p-1 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginErrors.matKhau && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">
                        {loginErrors.matKhau.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {loginLoading ? (
                      <>
                        <Spinner size="sm" color="current" />
                        <span>Đang xác thực...</span>
                      </>
                    ) : (
                      <>
                        <span>Đăng nhập</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </Card.Content>

              <Card.Footer className="px-0 pt-4 pb-0 justify-center">
                <button
                  type="button"
                  onClick={() => triggerSwitchMode('register')}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-teal-50 hover:border-teal-200 text-xs font-bold text-teal-700 transition-colors cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-teal-600" />
                  <span>Chưa có tài khoản? Đăng ký ngay</span>
                </button>
              </Card.Footer>
            </Card>
          ) : (
            <Card className="w-full border-none shadow-none bg-transparent p-0">
              <Card.Content className="px-0 py-0">
                <form onSubmit={handleRegisterSubmit(onSubmitRegister)} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên đăng nhập
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="VD: tran_khoa"
                        {...registerSignUp('tenDangNhap')}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600 transition-all"
                      />
                    </div>
                    {regErrors.tenDangNhap && (
                      <p className="text-[10px] text-red-500 mt-0.5">
                        {regErrors.tenDangNhap.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Trần Lê Khoa"
                      {...registerSignUp('hoVaTen')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600 transition-all"
                    />
                    {regErrors.hoVaTen && (
                      <p className="text-[10px] text-red-500 mt-0.5">{regErrors.hoVaTen.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          placeholder="name@domain.com"
                          {...registerSignUp('email')}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600 transition-all"
                        />
                      </div>
                      {regErrors.email && (
                        <p className="text-[10px] text-red-500 mt-0.5">{regErrors.email.message}</p>
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
                          placeholder="0912345678"
                          {...registerSignUp('sdt')}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600 transition-all"
                        />
                      </div>
                      {regErrors.sdt && (
                        <p className="text-[10px] text-red-500 mt-0.5">{regErrors.sdt.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegPass ? 'text' : 'password'}
                        placeholder="Tối thiểu 8 ký tự"
                        {...registerSignUp('matKhau')}
                        className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPass(!showRegPass)}
                        className="p-1 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {regErrors.matKhau && (
                      <p className="text-[10px] text-red-500 mt-0.5">{regErrors.matKhau.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegConfirmPass ? 'text' : 'password'}
                        placeholder="Nhập lại mật khẩu"
                        {...registerSignUp('xacNhanMatKhau')}
                        className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPass(!showRegConfirmPass)}
                        className="p-1 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showRegConfirmPass ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {regErrors.xacNhanMatKhau && (
                      <p className="text-[10px] text-red-500 mt-0.5">
                        {regErrors.xacNhanMatKhau.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {regLoading ? (
                      <>
                        <Spinner size="sm" color="current" />
                        <span>Đang khởi tạo...</span>
                      </>
                    ) : (
                      <span>Tạo tài khoản</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerSwitchMode('login')}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-teal-50 hover:border-teal-200 text-xs font-bold text-teal-700 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <span>Đã có tài khoản? Đăng nhập ngay</span>
                  </button>
                </form>
              </Card.Content>
            </Card>
          )}
        </div>

        {/* LỚP 2: BẢN ĐỒ HÀNH TRÌNH 2 VỊ TRÍ (LOGIN <-> REGISTER) */}
        {isTransitioning && (
          <div
            className={`absolute inset-2 rounded-2xl bg-teal-50/90 border border-teal-200 flex items-center justify-center overflow-hidden transition-all duration-250 ${
              mapVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            <div className="relative" style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}>
              <svg width={MAP_WIDTH} height={MAP_HEIGHT} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
                <defs>
                  <linearGradient id="webMapBg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F0FDFA" />
                    <stop offset="100%" stopColor="#E0F2FE" />
                  </linearGradient>
                </defs>

                <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} rx="16" fill="url(#webMapBg)" />
                <rect x="14" y="18" width="84" height="54" rx="8" fill="#DCFCE7" opacity="0.7" />
                <rect x="115" y="16" width="70" height="48" rx="6" fill="#E2E8F0" opacity="0.6" />
                <rect x="200" y="145" width="84" height="75" rx="8" fill="#DCFCE7" opacity="0.65" />
                <rect x="20" y="96" width="68" height="52" rx="6" fill="#E2E8F0" opacity="0.55" />
                <rect x="108" y="170" width="76" height="72" rx="8" fill="#E2E8F0" opacity="0.55" />

                <path
                  d="M -10 140 Q 85 110, 155 152 T 315 118"
                  stroke="#BAE6FD"
                  strokeWidth="16"
                  fill="none"
                  strokeLinecap="round"
                />

                <line x1="0" y1="86" x2={MAP_WIDTH} y2="86" stroke="#FFFFFF" strokeWidth="6" />
                <line x1="0" y1="205" x2={MAP_WIDTH} y2="205" stroke="#FFFFFF" strokeWidth="6" />
                <line x1="64" y1="0" x2="64" y2={MAP_HEIGHT} stroke="#FFFFFF" strokeWidth="6" />
                <line x1="236" y1="0" x2="236" y2={MAP_HEIGHT} stroke="#FFFFFF" strokeWidth="6" />

                <path
                  d={`M ${LOGIN_POS.x} ${LOGIN_POS.y} Q 138 205, 150 145 T ${REGISTER_POS.x} ${REGISTER_POS.y}`}
                  stroke="#118A7E"
                  strokeWidth="3.5"
                  strokeDasharray="7, 6"
                  fill="none"
                  strokeLinecap="round"
                />

                <g>
                  <circle cx={LOGIN_POS.x} cy={LOGIN_POS.y} r="15" fill="#CCFBF1" opacity="0.9" />
                  <circle cx={LOGIN_POS.x} cy={LOGIN_POS.y} r="7.5" fill="#118A7E" />
                  <circle cx={LOGIN_POS.x} cy={LOGIN_POS.y} r="3" fill="#FFFFFF" />
                </g>

                <g>
                  <circle
                    cx={REGISTER_POS.x}
                    cy={REGISTER_POS.y}
                    r="15"
                    fill="#CCFBF1"
                    opacity="0.9"
                  />
                  <circle cx={REGISTER_POS.x} cy={REGISTER_POS.y} r="7.5" fill="#118A7E" />
                  <circle cx={REGISTER_POS.x} cy={REGISTER_POS.y} r="3" fill="#FFFFFF" />
                </g>
              </svg>

              {/* Nhãn trạm LOGIN */}
              <div
                style={{ left: LOGIN_POS.x - 28, top: LOGIN_POS.y + 16 }}
                className="absolute px-2.5 py-0.5 rounded-full bg-slate-800 shadow-sm text-[10px] font-extrabold text-white tracking-wider"
              >
                LOGIN
              </div>

              {/* Nhãn trạm REGISTER */}
              <div
                style={{ left: REGISTER_POS.x - 36, top: REGISTER_POS.y + 16 }}
                className="absolute px-2.5 py-0.5 rounded-full bg-teal-700 shadow-sm text-[10px] font-extrabold text-white tracking-wider"
              >
                REGISTER
              </div>

              {/* Sóng lan tỏa khi Pin đáp xuống */}
              {rippleActive && (
                <div
                  style={{
                    left: ripplePos.x - 24,
                    top: ripplePos.y - 24,
                    width: 48,
                    height: 48,
                  }}
                  className="absolute rounded-full border-2 border-[#118A7E] bg-[#118A7E]/20 animate-ping"
                />
              )}

              {/* Bóng đổ của Pin */}
              <div
                ref={pinShadowRef}
                style={{
                  left: 0,
                  top: 0,
                  width: 26,
                  height: 10,
                  borderRadius: 13,
                  backgroundColor: '#0F172A',
                  opacity: 0.32,
                }}
                className="absolute pointer-events-none"
              />

              {/* Dấu định vị Pin nhảy giữa 2 trạm */}
              <div
                ref={jumpingPinRef}
                style={{
                  left: 0,
                  top: 0,
                  width: 48,
                  height: 48,
                }}
                className="absolute pointer-events-none"
              >
                <InnFinderPinIcon size={48} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
