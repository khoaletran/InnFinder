import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Building,
  KeyRound,
  Camera,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { authUserService } from '../../services/authUser.service';
import { uploadService } from '../../services/upload.service';
import type { BankAccountResponse } from '../../types/auth-user.types';
import { changePasswordSchema } from '../../utils/validators';
import { formatDate } from '../../utils/formatters';
import { VIETNAM_BANKS } from '../../constants/banks';
import { toast } from 'sonner';

export const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [bankAccounts, setBankAccounts] = useState<BankAccountResponse[]>([]);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Form profile
  const [hoVaTen, setHoVaTen] = useState(user?.hoVaTen || '');
  const [email, setEmail] = useState(user?.email || '');
  const [sdt, setSdt] = useState(user?.sdt || '');

  // Form Đổi mật khẩu
  const {
    register: registerPwd,
    handleSubmit: handleSubmitPwd,
    reset: resetPwd,
    formState: { errors: pwdErrors, isSubmitting: isSubmittingPwd },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  });

  // Form thêm ngân hàng
  const [newBankName, setNewBankName] = useState('Vietcombank');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newAccountHolder, setNewAccountHolder] = useState('');

  // Form nâng cấp Chủ trọ
  const [upgradeCccd, setUpgradeCccd] = useState('');
  const [upgradeFrontUrl, setUpgradeFrontUrl] = useState('');
  const [upgradeBackUrl, setUpgradeBackUrl] = useState('');
  const [upgradeBank, setUpgradeBank] = useState('Vietcombank');
  const [upgradeAccNum, setUpgradeAccNum] = useState('');
  const [upgradeAccHolder, setUpgradeAccHolder] = useState('');
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      const accounts = await authUserService.getMyBankAccounts();
      if (Array.isArray(accounts)) {
        setBankAccounts(accounts);
      }
    } catch {
      // Bỏ qua nếu lỗi kết nối
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const url = await uploadService.uploadImage(file, 'avatars');
      const updated = await authUserService.updateProfile({
        hinhDaiDien: url,
        avatarUrl: url,
        email: user?.email || '',
        sdt: user?.sdt || '',
      });
      setUser(updated);
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật ảnh đại diện');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdatingProfile(true);
      const updated = await authUserService.updateProfile({
        hoVaTen,
        email,
        sdt,
        hinhDaiDien: user?.hinhDaiDien,
      });
      setUser(updated);
      toast.success('Lưu thông tin hồ sơ thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật thông tin');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onSubmitChangePassword = async (data: any) => {
    try {
      await authUserService.changePassword({
        matKhauCu: data.matKhauCu,
        matKhauMoi: data.matKhauMoi,
        xacNhanMatKhauMoi: data.xacNhanMatKhauMoi,
      });
      toast.success('Đổi mật khẩu thành công!');
      setShowPasswordModal(false);
      resetPwd();
    } catch (err: any) {
      toast.error(err.message || 'Đổi mật khẩu thất bại. Mật khẩu cũ không đúng.');
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountNumber || newAccountNumber.length < 6) {
      toast.error('Số tài khoản phải có từ 6 đến 20 số');
      return;
    }
    try {
      await authUserService.addBankAccount({
        tenNganHang: newBankName,
        soTaiKhoan: newAccountNumber,
        tenChuTaiKhoan: newAccountHolder.toUpperCase(),
      });
      toast.success('Thêm tài khoản ngân hàng thành công!');
      setShowBankModal(false);
      setNewAccountNumber('');
      setNewAccountHolder('');
      loadBankAccounts();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi liên kết ngân hàng');
    }
  };

  const handleUpgradeToLandlord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (upgradeCccd.length !== 12) {
      toast.error('Căn cước công dân phải gồm đúng 12 chữ số');
      return;
    }
    if (!upgradeFrontUrl || !upgradeBackUrl) {
      toast.error('Vui lòng tải lên đầy đủ ảnh 2 mặt CCCD');
      return;
    }
    if (!upgradeAccNum || !upgradeAccHolder) {
      toast.error('Vui lòng điền đầy đủ thông tin tài khoản ngân hàng thụ hưởng');
      return;
    }

    try {
      setIsSubmittingUpgrade(true);
      await authUserService.upgradeToLandlord({
        cccd: upgradeCccd,
        anhCccdTruoc: upgradeFrontUrl,
        anhCccdSau: upgradeBackUrl,
        tenNganHang: upgradeBank,
        soTaiKhoan: upgradeAccNum,
        tenChuTaiKhoan: upgradeAccHolder.toUpperCase(),
      });
      toast.success('Đã gửi hồ sơ đăng ký làm Chủ trọ! Quản trị viên sẽ kiểm duyệt trong 24h.');
      setShowUpgradeModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi yêu cầu nâng cấp');
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Thông tin cá nhân & Tài khoản</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Quản lý thông tin hồ sơ, phương thức thanh toán ngân hàng và bảo mật tài khoản
        </p>
      </div>

      {/* Main Profile Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100">
          {/* Avatar Upload */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-blue-100 border-2 border-white shadow-md text-blue-700 font-bold flex items-center justify-center text-2xl overflow-hidden">
              {user?.hinhDaiDien || user?.avatarUrl ? (
                <img
                  src={user.hinhDaiDien || user.avatarUrl}
                  alt={user.hoVaTen || 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                (user?.hoVaTen || user?.tenDangNhap || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md cursor-pointer transition-all">
              {isUploadingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
                className="hidden"
              />
            </label>
          </div>

          {/* User Meta Information */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
              <h2 className="text-lg font-bold text-slate-900">
                {user?.hoVaTen || user?.tenDangNhap}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {user?.vaiTro === 'QUAN_TRI' ? 'Quản trị viên' : 'Khách thuê'}
              </span>
              {user?.chuTro && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Chủ trọ đã xác thực
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Mã định danh: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{user?.maNguoiDung}</code>
              <span className="mx-2">•</span>
              Ngày tham gia: {formatDate(user?.thoiGianMoTaiKhoan)}
            </p>

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                Đổi mật khẩu
              </button>

              {!user?.chuTro && (
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Building className="w-3.5 h-3.5" />
                  Nâng cấp lên Chủ trọ
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSaveProfile} className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={hoVaTen}
                onChange={(e) => setHoVaTen(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={sdt}
                onChange={(e) => setSdt(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Căn cước công dân (CCCD)
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                disabled
                value={user?.cccd || 'Chưa cập nhật'}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-500"
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {isUpdatingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>

      {/* Linked Bank Accounts Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Tài khoản ngân hàng liên kết</h3>
            <p className="text-xs text-slate-500">
              Sử dụng để hoàn trả tiền cọc giữ chân và rút tiền doanh thu
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBankModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm ngân hàng
          </button>
        </div>

        {bankAccounts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bankAccounts.map((b, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    {b.tenNganHang?.substring(0, 3).toUpperCase() || 'NH'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{b.tenNganHang}</h4>
                    <p className="text-xs text-slate-600 font-mono tracking-wider">
                      •••• •••• {b.soTaiKhoan?.slice(-4) || '••••'}
                    </p>
                    {b.tenChuTaiKhoan && (
                      <p className="text-[10px] text-slate-400 uppercase">{b.tenChuTaiKhoan}</p>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Đã liên kết
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
            <Building className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Chưa liên kết tài khoản ngân hàng nào</p>
          </div>
        )}
      </div>

      {/* MODAL 1: Đổi mật khẩu */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Đổi mật khẩu</h3>
            <p className="text-xs text-slate-500 mb-4">
              Mật khẩu mới yêu cầu ít nhất 8 ký tự gồm chữ và số
            </p>

            <form onSubmit={handleSubmitPwd(onSubmitChangePassword)} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu cũ"
                  {...registerPwd('matKhauCu')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
                {pwdErrors.matKhauCu && (
                  <p className="text-[10px] text-red-500 mt-0.5">
                    {pwdErrors.matKhauCu.message as string}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  placeholder="Tối thiểu 8 ký tự"
                  {...registerPwd('matKhauMoi')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
                {pwdErrors.matKhauMoi && (
                  <p className="text-[10px] text-red-500 mt-0.5">
                    {pwdErrors.matKhauMoi.message as string}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  {...registerPwd('xacNhanMatKhauMoi')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
                {pwdErrors.xacNhanMatKhauMoi && (
                  <p className="text-[10px] text-red-500 mt-0.5">
                    {pwdErrors.xacNhanMatKhauMoi.message as string}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="w-1/2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPwd}
                  className="w-1/2 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isSubmittingPwd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Thêm ngân hàng */}
      {showBankModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Liên kết ngân hàng mới</h3>
            <p className="text-xs text-slate-500 mb-4">
              Điền chính xác số tài khoản trùng khớp với tên trên CCCD
            </p>

            <form onSubmit={handleAddBank} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngân hàng</label>
                <select
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b.code} value={b.shortName}>
                      {b.shortName} - {b.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tài khoản
                </label>
                <input
                  type="text"
                  placeholder="Nhập số tài khoản ngân hàng"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên chủ tài khoản (In hoa)
                </label>
                <input
                  type="text"
                  placeholder="VD: NGUYEN VAN A"
                  value={newAccountHolder}
                  onChange={(e) => setNewAccountHolder(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="w-1/2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Liên kết
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Nâng cấp Chủ trọ */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Đăng ký nâng cấp vai trò Chủ trọ
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cung cấp CCCD và số tài khoản nhận tiền để bắt đầu đăng tin cho thuê phòng
            </p>

            <form onSubmit={handleUpgradeToLandlord} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số CCCD (12 số)
                </label>
                <input
                  type="text"
                  maxLength={12}
                  placeholder="VD: 079203001234"
                  value={upgradeCccd}
                  onChange={(e) => setUpgradeCccd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Ảnh mặt trước CCCD
                  </label>
                  <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-slate-50 text-center p-1">
                    {upgradeFrontUrl ? (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã tải lên
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Tải ảnh mặt trước</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const url = await uploadService.uploadImage(f, 'cccd');
                          setUpgradeFrontUrl(url);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Ảnh mặt sau CCCD
                  </label>
                  <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-slate-50 text-center p-1">
                    {upgradeBackUrl ? (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã tải lên
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Tải ảnh mặt sau</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const url = await uploadService.uploadImage(f, 'cccd');
                          setUpgradeBackUrl(url);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngân hàng</label>
                <select
                  value={upgradeBank}
                  onChange={(e) => setUpgradeBank(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b.code} value={b.shortName}>
                      {b.shortName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Số tài khoản
                  </label>
                  <input
                    type="text"
                    placeholder="Số tài khoản"
                    value={upgradeAccNum}
                    onChange={(e) => setUpgradeAccNum(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Chủ tài khoản
                  </label>
                  <input
                    type="text"
                    placeholder="Tên in hoa"
                    value={upgradeAccHolder}
                    onChange={(e) => setUpgradeAccHolder(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-1/2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUpgrade}
                  className="w-1/2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isSubmittingUpgrade ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Nộp hồ sơ'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
