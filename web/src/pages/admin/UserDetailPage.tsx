import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Chip } from '@heroui/react';
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  CreditCard,
  History,
  KeyRound,
  Landmark,
  Lock,
  Receipt,
  SlidersHorizontal,
  Unlock,
  User,
  Wallet,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { AdminErrorState, AdminRefreshButton } from '@/components/common/AdminStates';
import { Modal } from '@/components/common/Modal';
import { formatDateTime, formatVND } from '@/utils/formatters';
import { useAuthStore } from '@/store/useAuthStore';

type DetailTab = 'INFO' | 'TRANSACTIONS' | 'APPOINTMENTS' | 'ROOMS';

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<DetailTab>('INFO');
  const [isReputationModalOpen, setIsReputationModalOpen] = useState(false);
  const [nextScoreInput, setNextScoreInput] = useState('100');
  const [adjustReason, setAdjustReason] = useState('');
  const [clearTempHide, setClearTempHide] = useState(false);

  const {
    data: detail,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'user-detail', id],
    queryFn: () => adminService.getUserDetail(id!),
    enabled: Boolean(id),
  });

  const toggleLockMutation = useMutation({
    mutationFn: () => adminService.toggleLockUser(id!),
    onSuccess: (updated) => {
      const locked = Boolean(updated.trangThaiKhoa || updated.trangThai === 'KHOA');
      toast.success(locked ? 'Đã khóa tài khoản người dùng' : 'Đã mở khóa tài khoản người dùng');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'user-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái khóa');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => adminService.resetUserPassword(id!),
    onSuccess: () => {
      toast.success('Đã đặt lại mật khẩu mặc định (InnFinder@2026) thành công!');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi đặt lại mật khẩu');
    },
  });

  const adjustReputationMutation = useMutation({
    mutationFn: () =>
      adminService.adjustLandlordReputation(id!, {
        diemMoi: Number(nextScoreInput),
        lyDo: adjustReason.trim(),
        goTamAn: clearTempHide,
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật điểm uy tín Chủ trọ thành công!');
      setIsReputationModalOpen(false);
      setAdjustReason('');
      setClearTempHide(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'user-detail', id] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi điều chỉnh điểm uy tín');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-36 rounded-lg bg-surface-muted" />
          <div className="flex gap-2">
            <div className="h-8 w-28 rounded-lg bg-surface-muted" />
            <div className="h-8 w-28 rounded-lg bg-surface-muted" />
          </div>
        </div>
        <div className="h-28 rounded-xl bg-surface border border-border" />
        <div className="flex gap-2">
          <div className="h-9 w-36 rounded-lg bg-surface-muted" />
          <div className="h-9 w-28 rounded-lg bg-surface-muted" />
          <div className="h-9 w-32 rounded-lg bg-surface-muted" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 rounded-xl bg-surface border border-border" />
          <div className="h-48 rounded-xl bg-surface border border-border" />
        </div>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <AdminErrorState
        title="Không thể tải chi tiết người dùng"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    );
  }

  const {
    user,
    soDu,
    diemUyTin,
    tamAnDen,
    lichSuDiemUyTin = [],
    taiKhoanNganHang,
    giaoDich,
    lichXemPhong,
    phongChoThue,
  } = detail;
  const effectiveReputation = diemUyTin ?? user.diemUyTin ?? 100;
  const isTempHidden = Boolean(tamAnDen && new Date(tamAnDen).getTime() > Date.now());
  const isLocked = Boolean(user.trangThaiKhoa || user.trangThai === 'KHOA');
  const isSelf = user.maNguoiDung === currentUser?.maNguoiDung;
  const isLandlord = Boolean(user.chuTro || phongChoThue.length > 0);

  const tabs: Array<{ key: DetailTab; label: string; count?: number; icon: React.ReactNode }> = [
    { key: 'INFO', label: 'Thông tin & Ngân hàng', icon: <User className="w-3.5 h-3.5" /> },
    {
      key: 'TRANSACTIONS',
      label: 'Giao dịch',
      count: giaoDich.length,
      icon: <CreditCard className="w-3.5 h-3.5" />,
    },
    {
      key: 'APPOINTMENTS',
      label: 'Hóa đơn & Lịch hẹn',
      count: lichXemPhong.length,
      icon: <Receipt className="w-3.5 h-3.5" />,
    },
    ...(isLandlord
      ? [
          {
            key: 'ROOMS' as const,
            label: 'Phòng cho thuê',
            count: phongChoThue.length,
            icon: <Building2 className="w-3.5 h-3.5" />,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-text-secondary hover:bg-surface-subtle cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại danh sách
        </button>

        <div className="flex items-center gap-2">
          <AdminRefreshButton onClick={() => void refetch()} isRefreshing={isFetching} />
          {isLandlord && (
            <button
              type="button"
              onClick={() => {
                setNextScoreInput(String(effectiveReputation));
                setClearTempHide(isTempHidden);
                setAdjustReason('');
                setIsReputationModalOpen(true);
              }}
              className="px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-xs font-medium text-text flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
              Điều chỉnh uy tín
            </button>
          )}
          <button
            type="button"
            disabled={resetPasswordMutation.isPending}
            onClick={() => resetPasswordMutation.mutate()}
            className="px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-xs font-medium text-text flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <KeyRound className="w-3.5 h-3.5 text-warning-text" />
            Đặt lại mật khẩu
          </button>
          <button
            type="button"
            disabled={toggleLockMutation.isPending || isSelf}
            onClick={() => toggleLockMutation.mutate()}
            className={`px-3 py-2 rounded-lg text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isLocked ? 'bg-success-text hover:opacity-90' : 'bg-danger-text hover:opacity-90'
            }`}
          >
            {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <Card className="bg-surface rounded-xl border border-border p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-surface-muted text-text-secondary font-bold flex items-center justify-center text-xl overflow-hidden shrink-0">
              {user.avatarUrl || user.hinhDaiDien ? (
                <img
                  src={user.avatarUrl || user.hinhDaiDien}
                  alt={user.hoVaTen}
                  className="w-full h-full object-cover"
                />
              ) : (
                (user.hoVaTen || user.tenDangNhap || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-text">
                  {user.hoVaTen || user.tenDangNhap}
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-subtle border border-border text-text-muted">
                  {user.maNguoiDung}
                </span>
                {isLocked ? (
                  <Chip size="sm" variant="soft" color="danger" className="font-semibold">
                    Đã khóa
                  </Chip>
                ) : (
                  <Chip size="sm" variant="soft" color="success" className="font-semibold">
                    Hoạt động
                  </Chip>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                @{user.tenDangNhap} • {user.vaiTro === 'QUAN_TRI' ? 'Quản trị viên' : 'Khách hàng'}
                {isLandlord ? ' • Chủ trọ' : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-surface-subtle border border-border">
              <span className="text-[11px] text-text-muted block">Điểm uy tín</span>
              <span
                className={`font-bold tabular-nums ${
                  effectiveReputation < 50
                    ? 'text-danger-text'
                    : effectiveReputation < 70
                      ? 'text-warning-text'
                      : 'text-success-text'
                }`}
              >
                {effectiveReputation} / 100
              </span>
              {isTempHidden && tamAnDen && (
                <span className="block text-[10px] text-danger-text mt-0.5">
                  Tạm ẩn đến {formatDateTime(tamAnDen)}
                </span>
              )}
            </div>
            {isLandlord && (
              <div className="p-3 rounded-lg bg-surface-subtle border border-border">
                <span className="text-[11px] text-text-muted flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Số dư ví
                </span>
                <span className="font-bold text-accent tabular-nums">{formatVND(soDu)}</span>
              </div>
            )}
            <div className="p-3 rounded-lg bg-surface-subtle border border-border">
              <span className="text-[11px] text-text-muted block">Giao dịch</span>
              <span className="font-bold text-text tabular-nums">{giaoDich.length}</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-subtle border border-border">
              <span className="text-[11px] text-text-muted block">Lịch hẹn / Hóa đơn</span>
              <span className="font-bold text-text tabular-nums">{lichXemPhong.length}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'bg-accent text-white'
                : 'bg-surface text-text-secondary hover:bg-surface-subtle border border-border'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none tabular-nums ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-surface-muted text-text-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'INFO' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-surface rounded-xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-bold text-text">Thông tin định danh & Liên hệ</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-subtle border border-border">
                <span className="text-[11px] text-text-muted block">Email</span>
                <span className="font-medium text-text break-all">{user.email || '--'}</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-subtle border border-border">
                <span className="text-[11px] text-text-muted block">Số điện thoại</span>
                <span className="font-medium text-text">{user.sdt || '--'}</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-subtle border border-border">
                <span className="text-[11px] text-text-muted block">CCCD</span>
                <span className="font-mono font-medium text-text">
                  {user.cccd || 'Chưa cập nhật'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-subtle border border-border">
                <span className="text-[11px] text-text-muted block">Ngày mở tài khoản</span>
                <span className="font-medium text-text">
                  {formatDateTime(user.ngayTao)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="bg-surface rounded-xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-bold text-text flex items-center gap-2">
              <Landmark className="w-4 h-4 text-accent" />
              Tài khoản ngân hàng liên kết ({taiKhoanNganHang.length})
            </h2>
            {taiKhoanNganHang.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                Người dùng chưa liên kết tài khoản ngân hàng nào.
              </p>
            ) : (
              <div className="space-y-2.5">
                {taiKhoanNganHang.map((bank) => (
                  <div
                    key={bank.id}
                    className="p-3 rounded-lg bg-surface-subtle border border-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-text">{bank.tenNganHang}</div>
                      <div className="font-mono text-text-secondary mt-0.5">{bank.soTaiKhoan}</div>
                      {bank.tenChuTaiKhoan && (
                        <div className="text-[11px] text-text-muted mt-0.5">
                          {bank.tenChuTaiKhoan}
                        </div>
                      )}
                    </div>
                    {bank.macDinh && (
                      <Chip size="sm" variant="soft" color="success" className="font-semibold">
                        Mặc định
                      </Chip>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'INFO' && isLandlord && (
        <Card className="bg-surface rounded-xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-bold text-text flex items-center gap-2">
            <History className="w-4 h-4 text-accent" />
            Lịch sử biến động điểm uy tín ({lichSuDiemUyTin.length})
          </h2>
          {lichSuDiemUyTin.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">
              Chưa có lịch sử điều chỉnh hoặc xử phạt điểm uy tín.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {lichSuDiemUyTin.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-text">{item.lyDo}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {formatDateTime(item.thoiGian)} • {item.loaiSuKien}
                      {item.maThamChieu ? ` • #${item.maThamChieu}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`font-bold tabular-nums ${
                        item.bienDong > 0
                          ? 'text-success-text'
                          : item.bienDong < 0
                            ? 'text-danger-text'
                            : 'text-warning-text'
                      }`}
                    >
                      {item.bienDong > 0 ? `+${item.bienDong}` : item.bienDong}
                    </span>
                    <div className="text-[10px] text-text-muted tabular-nums">
                      {item.diemTruoc} ➔ {item.diemSau}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'TRANSACTIONS' && (
        <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
          <Card.Content className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle border-b border-border text-[11px] font-bold text-text-muted uppercase">
                <tr>
                  <th className="py-3 px-4">Mã giao dịch</th>
                  <th className="py-3 px-4">Loại</th>
                  <th className="py-3 px-4">Số tiền</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Nội dung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {giaoDich.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      Chưa có giao dịch nào phát sinh.
                    </td>
                  </tr>
                ) : (
                  giaoDich.map((gd) => (
                    <tr key={gd.maGiaoDich} className="hover:bg-surface-subtle/60">
                      <td className="py-3 px-4 font-mono font-semibold text-accent">
                        {gd.maGiaoDich}
                      </td>
                      <td className="py-3 px-4 font-medium text-text">{gd.loaiGiaoDich}</td>
                      <td className="py-3 px-4 font-bold text-text tabular-nums">
                        {formatVND(gd.soTien)}
                      </td>
                      <td className="py-3 px-4">
                        <Chip
                          size="sm"
                          variant="soft"
                          color={
                            gd.trangThai === 'THANH_CONG'
                              ? 'success'
                              : gd.trangThai === 'CHO_THANH_TOAN'
                                ? 'warning'
                                : 'danger'
                          }
                        >
                          {gd.trangThai}
                        </Chip>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        {formatDateTime(gd.thoiGian)}
                      </td>
                      <td className="py-3 px-4 text-text-muted max-w-xs truncate">
                        {gd.ghiChu || '--'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      )}

      {activeTab === 'APPOINTMENTS' && (
        <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
          <Card.Content className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle border-b border-border text-[11px] font-bold text-text-muted uppercase">
                <tr>
                  <th className="py-3 px-4">Mã lịch hẹn</th>
                  <th className="py-3 px-4">Phòng trọ</th>
                  <th className="py-3 px-4">Khách / Chủ trọ</th>
                  <th className="py-3 px-4">Ngày hẹn</th>
                  <th className="py-3 px-4">Cọc giữ chân</th>
                  <th className="py-3 px-4">Hoa hồng sàn</th>
                  <th className="py-3 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lichXemPhong.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      <CalendarCheck className="w-7 h-7 mx-auto mb-2 opacity-40" />
                      Chưa có hóa đơn cọc hoặc lịch hẹn xem phòng nào.
                    </td>
                  </tr>
                ) : (
                  lichXemPhong.map((apt) => (
                    <tr key={apt.maDatLich} className="hover:bg-surface-subtle/60">
                      <td className="py-3 px-4 font-mono font-semibold text-accent">
                        {apt.maDatLich}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-text truncate">{apt.tenPhongTro}</div>
                        {apt.maPhongTro && (
                          <div className="text-[10px] font-mono text-text-muted">{apt.maPhongTro}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-text">Khách: {apt.tenKhachHang} ({apt.sdtKhachHang})</div>
                        <div className="text-[11px] text-text-muted">
                          Chủ: {apt.tenChuTro} ({apt.sdtChuTro})
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        {formatDateTime(apt.ngayHen)}
                      </td>
                      <td className="py-3 px-4 font-bold text-text tabular-nums">
                        {formatVND(apt.tienCoc)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-accent tabular-nums">
                        {formatVND(apt.phiThu)}
                      </td>
                      <td className="py-3 px-4">
                        <Chip
                          size="sm"
                          variant="soft"
                          color={
                            apt.trangThai === 'HOAN_THANH'
                              ? 'success'
                              : apt.trangThai === 'XAC_NHAN'
                                ? 'accent'
                                : apt.trangThai === 'CHO_XAC_NHAN'
                                  ? 'warning'
                                  : 'danger'
                          }
                        >
                          {apt.trangThai}
                        </Chip>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      )}

      {activeTab === 'ROOMS' && isLandlord && (
        <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
          <Card.Content className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle border-b border-border text-[11px] font-bold text-text-muted uppercase">
                <tr>
                  <th className="py-3 px-4">Mã phòng</th>
                  <th className="py-3 px-4">Phòng & Địa chỉ</th>
                  <th className="py-3 px-4">Giá thuê</th>
                  <th className="py-3 px-4">Diện tích</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Ngày đăng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {phongChoThue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      Chủ trọ này chưa đăng phòng cho thuê nào.
                    </td>
                  </tr>
                ) : (
                  phongChoThue.map((room) => (
                    <tr key={room.maPhongTro} className="hover:bg-surface-subtle/60">
                      <td className="py-3 px-4 font-mono font-semibold text-accent">
                        {room.maPhongTro}
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-text truncate">{room.tieuDe}</div>
                        <div className="text-[11px] text-text-muted truncate">{room.diaChi}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-text tabular-nums">
                        {formatVND(room.giaThue)}
                      </td>
                      <td className="py-3 px-4 text-text-secondary">{room.dienTich} m²</td>
                      <td className="py-3 px-4">
                        <Chip
                          size="sm"
                          variant="soft"
                          color={
                            room.trangThai === 'DA_DUYET'
                              ? 'success'
                              : room.trangThai === 'CHO_DUYET'
                                ? 'warning'
                                : room.trangThai === 'HOAN_THANH'
                                  ? 'accent'
                                  : 'danger'
                          }
                        >
                          {room.trangThai}
                        </Chip>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        {formatDateTime(room.thoiGianDang)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      )}

      <Modal
        isOpen={isReputationModalOpen}
        onClose={() => setIsReputationModalOpen(false)}
        title="Điều chỉnh điểm uy tín Chủ trọ"
        subtitle={`${user.hoVaTen || user.tenDangNhap} (${user.maNguoiDung})`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsReputationModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-text-secondary hover:bg-surface-subtle cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={adjustReputationMutation.isPending}
              onClick={() => {
                const parsed = Number(nextScoreInput);
                if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
                  toast.error('Điểm uy tín mới phải là số nguyên từ 0 đến 100');
                  return;
                }
                if (!adjustReason.trim()) {
                  toast.error('Vui lòng nhập lý do điều chỉnh');
                  return;
                }
                adjustReputationMutation.mutate();
              }}
              className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {adjustReputationMutation.isPending ? 'Đang lưu...' : 'Xác nhận điều chỉnh'}
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-text mb-1.5">
              Điểm uy tín mới (0 – 100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={nextScoreInput}
              onChange={(e) => setNextScoreInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm font-semibold"
            />
          </div>
          {isTempHidden && (
            <label className="flex items-center gap-2 cursor-pointer select-none p-3 rounded-lg bg-surface-subtle border border-border">
              <input
                type="checkbox"
                checked={clearTempHide}
                onChange={(e) => setClearTempHide(e.target.checked)}
                className="rounded border-border"
              />
              <span className="font-medium text-text">
                Gỡ trạng thái tạm ẩn bài đăng 7 ngày ngay lập tức
              </span>
            </label>
          )}
          <div>
            <label className="block font-semibold text-text mb-1.5">
              Lý do điều chỉnh (bắt buộc)
            </label>
            <textarea
              rows={3}
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="Ví dụ: Giải oan khiếu nại #KN..., khôi phục uy tín sau xác minh thực tế..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-xs"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
