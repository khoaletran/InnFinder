import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Chip, Spinner } from '@heroui/react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import {
  Search,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Modal } from '@/components/common/Modal';
import { StatusTabBar } from '@/components/common/StatusTabBar';
import {
  AdminErrorState,
  AdminRefreshButton,
  AdminTableSkeleton,
} from '@/components/common/AdminStates';
import { formatDateTime } from '@/utils/formatters';
import { createAdminSchema } from '@/utils/validators';
import { useAuthStore } from '@/store/useAuthStore';
import type { AdminUserItem, AdminLandlordRequestItem } from '@/types/admin.types';
import type { TrangThaiYeuCauChuTro, VaiTro } from '@/types/auth-user.types';

type CreateAdminFormValues = z.infer<typeof createAdminSchema>;

const formatRoleLabel = (role: VaiTro): string =>
  role === 'QUAN_TRI' ? 'Quản trị viên' : 'Khách hàng';

const maskSensitive = (value?: string, visibleDigits = 4): string => {
  if (!value) return '--';
  const clean = value.trim();
  if (clean.length <= visibleDigits) return clean;
  return `${'•'.repeat(Math.min(clean.length - visibleDigits, 8))}${clean.slice(-visibleDigits)}`;
};

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'USERS' | 'LANDLORD_REQUESTS'>('USERS');
  const [landlordStatusTab, setLandlordStatusTab] = useState<TrangThaiYeuCauChuTro>('CHO_DUYET');
  const [searchInput, setSearchInput] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(0);

  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [resetTargetUser, setResetTargetUser] = useState<AdminUserItem | null>(null);
  const [lockTargetUser, setLockTargetUser] = useState<AdminUserItem | null>(null);
  const [selectedLandlordRequest, setSelectedLandlordRequest] =
    useState<AdminLandlordRequestItem | null>(null);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [showNewAdminPwd, setShowNewAdminPwd] = useState(false);
  const [showConfirmAdminPwd, setShowConfirmAdminPwd] = useState(false);
  const [showCurrentAdminPwd, setShowCurrentAdminPwd] = useState(false);

  const {
    register: registerCreateAdmin,
    handleSubmit: handleSubmitCreateAdmin,
    reset: resetCreateAdminForm,
    formState: { errors: createAdminErrors },
  } = useForm<CreateAdminFormValues>({
    resolver: zodResolver(createAdminSchema),
    mode: 'onChange',
    defaultValues: {
      tenDangNhap: '',
      hoVaTen: '',
      email: '',
      sdt: '',
      matKhau: '',
      xacNhanMatKhau: '',
      matKhauAdminHienTai: '',
    },
  });

  // Modal từ chối chủ trọ
  const [rejectingRequest, setRejectingRequest] = useState<AdminLandlordRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const hasSearchQuery = submittedKeyword.trim().length > 0;

  const {
    data: usersPage,
    isLoading: isLoadingUsers,
    isFetching: isFetchingUsers,
    isError: isErrorUsers,
    error: errorUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['admin', 'users', submittedKeyword, page],
    queryFn: () => adminService.getUsers(submittedKeyword, page, 15),
    enabled: hasSearchQuery,
  });

  const {
    data: landlordRequests = [],
    isLoading: isLoadingRequests,
    isFetching: isFetchingRequests,
    isError: isErrorRequests,
    error: errorRequests,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ['admin', 'landlord-requests'],
    queryFn: () => adminService.getLandlordRequests(),
  });

  const handleRefresh = () => {
    if (hasSearchQuery) {
      void refetchUsers();
    }
    void refetchRequests();
  };

  const toggleLockMutation = useMutation({
    mutationFn: (userItem: AdminUserItem) => adminService.toggleLockUser(userItem.maNguoiDung),
    onSuccess: (_data, userItem) => {
      const isNowLocked = !(userItem.trangThai === 'KHOA' || userItem.trangThaiKhoa);
      toast.success(
        isNowLocked
          ? `Đã khóa tài khoản ${userItem.tenDangNhap}`
          : `Đã mở khóa tài khoản ${userItem.tenDangNhap}`,
      );
      setLockTargetUser(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật khóa tài khoản');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userItem: AdminUserItem) => adminService.resetUserPassword(userItem.maNguoiDung),
    onSuccess: (_data, userItem) => {
      toast.success(`Đã đặt lại mật khẩu mặc định (InnFinder@2026) cho ${userItem.tenDangNhap}!`);
      setResetTargetUser(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi đặt lại mật khẩu');
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: (values: CreateAdminFormValues) =>
      adminService.createAdmin({
        tenDangNhap: values.tenDangNhap.trim(),
        hoVaTen: values.hoVaTen.trim(),
        email: values.email.trim(),
        sdt: values.sdt.trim(),
        matKhau: values.matKhau,
        matKhauAdminHienTai: values.matKhauAdminHienTai,
      }),
    onSuccess: (created) => {
      toast.success(`Đã tạo tài khoản Quản trị viên ${created.tenDangNhap} thành công!`);
      setShowCreateAdminModal(false);
      resetCreateAdminForm();
      setSearchInput(created.tenDangNhap);
      setSubmittedKeyword(created.tenDangNhap);
      setPage(0);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi tạo tài khoản Quản trị viên');
    },
  });

  const approveLandlordMutation = useMutation({
    mutationFn: (id: string | number) => adminService.approveLandlordRequest(id),
    onSuccess: () => {
      toast.success('Đã duyệt hồ sơ Chủ trọ thành công!');
      setSelectedLandlordRequest(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'landlord-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi phê duyệt hồ sơ Chủ trọ');
    },
  });

  const rejectLandlordMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string | number; reason: string }) =>
      adminService.rejectLandlordRequest(id, reason),
    onSuccess: () => {
      toast.success('Đã từ chối đơn đăng ký làm Chủ trọ!');
      setRejectingRequest(null);
      setSelectedLandlordRequest(null);
      setRejectReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'landlord-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi từ chối hồ sơ');
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setSubmittedKeyword(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSubmittedKeyword('');
    setPage(0);
  };

  const handleConfirmRejectLandlord = () => {
    if (!rejectingRequest) return;
    const reqId = rejectingRequest.maYeuCau || rejectingRequest.id;
    const trimmedReason =
      rejectReason.trim() || 'Ảnh CCCD không rõ hoặc số tài khoản ngân hàng không trùng khớp';
    rejectLandlordMutation.mutate({ id: reqId, reason: trimmedReason });
  };

  const renderLandlordStatusBadge = (status: TrangThaiYeuCauChuTro) => {
    switch (status) {
      case 'CHO_DUYET':
        return (
          <Chip size="sm" variant="soft" color="warning" className="font-bold">
            Chờ duyệt
          </Chip>
        );
      case 'DA_DUYET':
        return (
          <Chip size="sm" variant="soft" color="success" className="font-bold">
            Đã duyệt
          </Chip>
        );
      case 'TU_CHOI':
        return (
          <Chip size="sm" variant="soft" color="danger" className="font-bold">
            Đã từ chối
          </Chip>
        );
    }
  };

  const users = usersPage?.content ?? [];
  const totalElements = usersPage?.totalElements ?? 0;
  const totalPages = Math.max(usersPage?.totalPages ?? 1, 1);
  const pendingLandlordCount = landlordRequests.filter((r) => r.trangThai === 'CHO_DUYET').length;
  const approvedLandlordCount = landlordRequests.filter((r) => r.trangThai === 'DA_DUYET').length;
  const rejectedLandlordCount = landlordRequests.filter((r) => r.trangThai === 'TU_CHOI').length;
  const filteredLandlordRequests = landlordRequests.filter(
    (r) => r.trangThai === landlordStatusTab,
  );

  return (
    <div className="space-y-6">
      {/* Title & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Quản lý Tài khoản & Phân quyền
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-slate-200/70 p-1 text-xs font-semibold gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('USERS')}
              className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'USERS'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Tra cứu người dùng
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('LANDLORD_REQUESTS')}
              className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'LANDLORD_REQUESTS'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Duyệt CCCD Chủ trọ
              {pendingLandlordCount > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] leading-none">
                  {pendingLandlordCount}
                </span>
              )}
            </button>
          </div>

          <AdminRefreshButton
            onClick={handleRefresh}
            isRefreshing={isFetchingUsers || isFetchingRequests}
          />

          <button
            type="button"
            onClick={() => {
              resetCreateAdminForm();
              setShowCreateAdminModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Thêm Quản trị viên
          </button>
        </div>
      </div>

      {activeTab === 'USERS' ? (
        /* TAB 1: TRA CỨU NGƯỜI DÙNG */
        hasSearchQuery && isErrorUsers ? (
          <AdminErrorState
            title="Không thể tải danh sách người dùng"
            message={errorUsers instanceof Error ? errorUsers.message : undefined}
            onRetry={() => void refetchUsers()}
          />
        ) : (
          <Card className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-0">
            <Card.Header className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 sm:flex-none sm:w-96 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Nhập mã ND, tên đăng nhập, họ tên, email, SĐT, CCCD..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Tìm kiếm
                </button>
                {(searchInput || hasSearchQuery) && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Xóa
                  </button>
                )}
              </form>
              {hasSearchQuery ? (
                <span className="text-xs font-medium text-slate-500">
                  Tìm thấy{' '}
                  <strong className="text-slate-800">{totalElements.toLocaleString('vi-VN')}</strong>{' '}
                  tài khoản
                </span>
              ) : (
                <span className="text-xs text-slate-400">Nhập từ khóa và bấm Tìm kiếm</span>
              )}
            </Card.Header>

            {!hasSearchQuery ? (
              <Card.Content className="py-14 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Nhập thông tin để tra cứu tài khoản
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Hỗ trợ tìm nhanh theo <strong>Mã ND</strong>, <strong>Tên đăng nhập</strong>,{' '}
                  <strong>Họ tên</strong>, <strong>Email</strong>, <strong>Số điện thoại</strong>{' '}
                  hoặc <strong>CCCD</strong>. Dữ liệu chỉ tải khi tìm kiếm để đảm bảo tốc độ mượt
                  mà.
                </p>
              </Card.Content>
            ) : (
              <>
                <Card.Content className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Mã & Thành viên</th>
                    <th className="py-3 px-4">Liên hệ</th>
                    <th className="py-3 px-4">CCCD</th>
                    <th className="py-3 px-4">Vai trò</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingUsers ? (
                    <AdminTableSkeleton rows={6} cols={6} />
                  ) : users.length > 0 ? (
                    users.map((u) => {
                      const isLocked = u.trangThai === 'KHOA' || u.trangThaiKhoa;
                      return (
                        <tr key={u.maNguoiDung} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                                {u.avatarUrl || u.hinhDaiDien ? (
                                  <img
                                    src={u.avatarUrl || u.hinhDaiDien}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  (u.hoVaTen || u.tenDangNhap || 'U').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800">
                                  {u.hoVaTen || u.tenDangNhap}
                                </div>
                                <code className="text-[10px] text-slate-400 font-mono">
                                  {u.maNguoiDung}
                                </code>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{u.email}</div>
                            <div className="text-[11px] text-slate-400">{u.sdt}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">{u.cccd || '--'}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 items-center">
                              <Chip
                                size="sm"
                                variant="soft"
                                color={u.vaiTro === 'QUAN_TRI' ? 'accent' : 'default'}
                                className="font-bold"
                              >
                                {formatRoleLabel(u.vaiTro)}
                              </Chip>
                              {u.chuTro && (
                                <Chip size="sm" variant="soft" color="success" className="font-bold">
                                  Chủ trọ
                                </Chip>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isLocked ? (
                              <Chip size="sm" variant="soft" color="danger" className="font-bold">
                                Đã khóa
                              </Chip>
                            ) : (
                              <Chip size="sm" variant="soft" color="success" className="font-bold">
                                Hoạt động
                              </Chip>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedUser(u)}
                                title="Xem chi tiết"
                                className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setResetTargetUser(u)}
                                title="Đặt lại mật khẩu"
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                              {(() => {
                                const isSelf = u.maNguoiDung === currentUser?.maNguoiDung;
                                return (
                                  <button
                                    type="button"
                                    disabled={toggleLockMutation.isPending || isSelf}
                                    onClick={() => !isSelf && setLockTargetUser(u)}
                                    title={
                                      isSelf
                                        ? 'Không thể tự khóa tài khoản của chính mình'
                                        : isLocked
                                          ? 'Mở khóa tài khoản'
                                          : 'Khóa tài khoản'
                                    }
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      isSelf
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : isLocked
                                          ? 'text-red-600 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer'
                                          : 'text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                                    }`}
                                  >
                                    {isLocked ? (
                                      <Unlock className="w-4 h-4" />
                                    ) : (
                                      <Lock className="w-4 h-4" />
                                    )}
                                  </button>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        {submittedKeyword
                          ? `Không tìm thấy tài khoản nào khớp với "${submittedKeyword}".`
                          : 'Chưa có tài khoản người dùng nào trong hệ thống.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card.Content>

            {totalPages > 1 && (
              <Card.Footer className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Trang trước
                </button>
                <span className="text-slate-500 font-medium">
                  Trang {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Trang sau
                </button>
              </Card.Footer>
            )}
              </>
            )}
          </Card>
        )
      ) : (
        /* TAB 2: DUYỆT CCCD CHỦ TRỌ */
        <div className="space-y-4">
          <StatusTabBar
            ariaLabel="Lọc hồ sơ Chủ trọ theo trạng thái"
            activeKey={landlordStatusTab}
            onChange={setLandlordStatusTab}
            tabs={[
              {
                key: 'CHO_DUYET',
                label: 'Chờ duyệt',
                count: pendingLandlordCount,
                icon: Clock,
              },
              {
                key: 'DA_DUYET',
                label: 'Đã duyệt',
                count: approvedLandlordCount,
                icon: CheckCircle2,
              },
              {
                key: 'TU_CHOI',
                label: 'Đã từ chối',
                count: rejectedLandlordCount,
                icon: XCircle,
              },
            ]}
          />

          {isLoadingRequests ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="h-72 bg-white rounded-2xl border border-slate-200 p-5" />
              ))}
            </div>
          ) : isErrorRequests ? (
            <AdminErrorState
              title="Không thể tải danh sách hồ sơ Chủ trọ"
              message={errorRequests instanceof Error ? errorRequests.message : undefined}
              onRetry={() => void refetchRequests()}
            />
          ) : filteredLandlordRequests.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredLandlordRequests.map((req) => {
                const reqId = req.maYeuCau || req.id;
                return (
                  <Card
                    key={reqId}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
                  >
                    <Card.Header className="p-0 flex flex-row items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Card.Title className="text-sm font-bold text-slate-900 truncate">
                          {req.hoVaTen}
                        </Card.Title>
                        <Card.Description className="text-xs text-slate-500 truncate">
                          {req.email} • {req.sdt}
                        </Card.Description>
                        {req.ngayGui && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Gửi lúc: {formatDateTime(req.ngayGui)}
                          </p>
                        )}
                      </div>
                      {renderLandlordStatusBadge(req.trangThai)}
                    </Card.Header>

                    <Card.Content className="p-0 space-y-2.5">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex flex-wrap items-center justify-between gap-2">
                        <div className="font-mono text-slate-700">
                          CCCD: <strong>{maskSensitive(req.cccd)}</strong>
                        </div>
                        <div className="text-slate-600 font-medium flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {req.tenNganHang} •{' '}
                            <span className="font-mono">{maskSensitive(req.soTaiKhoan)}</span>
                          </span>
                        </div>
                      </div>

                      {req.trangThai === 'TU_CHOI' && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                          <div className="line-clamp-2">
                            <span className="font-bold">Lý do từ chối: </span>
                            <span>{req.lyDoTuChoi || 'Không đáp ứng điều kiện xác thực hồ sơ'}</span>
                          </div>
                        </div>
                      )}
                    </Card.Content>

                    <Card.Footer className="p-0 pt-1 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLandlordRequest(req)}
                        className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-600" />
                        Xem chi tiết & CCCD
                      </button>

                      {req.trangThai === 'CHO_DUYET' && (
                        <>
                          <button
                            type="button"
                            disabled={approveLandlordMutation.isPending || rejectLandlordMutation.isPending}
                            onClick={() => {
                              setRejectingRequest(req);
                              setRejectReason('');
                            }}
                            className="py-2 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            disabled={approveLandlordMutation.isPending || rejectLandlordMutation.isPending}
                            onClick={() => approveLandlordMutation.mutate(reqId)}
                            className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Phê duyệt Chủ trọ
                          </button>
                        </>
                      )}
                    </Card.Footer>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Card.Content className="p-0">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Danh sách trống</h4>
                <p className="text-[11px] text-slate-400">
                  Không có hồ sơ đăng ký làm Chủ trọ nào ở trạng thái này.
                </p>
              </Card.Content>
            </Card>
          )}
        </div>
      )}

      {/* MODAL CHI TIẾT NGƯỜI DÙNG */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="Hồ sơ chi tiết thành viên"
        subtitle={selectedUser ? `Mã định danh: ${selectedUser.maNguoiDung}` : undefined}
        maxWidth="lg"
        footer={
          <button
            type="button"
            onClick={() => setSelectedUser(null)}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Đóng
          </button>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-xl overflow-hidden shrink-0">
                {selectedUser.avatarUrl || selectedUser.hinhDaiDien ? (
                  <img
                    src={selectedUser.avatarUrl || selectedUser.hinhDaiDien}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (selectedUser.hoVaTen || selectedUser.tenDangNhap || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {selectedUser.hoVaTen || selectedUser.tenDangNhap}
                </h4>
                <p className="text-xs text-slate-500">@{selectedUser.tenDangNhap}</p>
                <div className="flex gap-2 mt-1.5">
                  <Chip size="sm" variant="soft" color="accent" className="font-bold">
                    {formatRoleLabel(selectedUser.vaiTro)}
                  </Chip>
                  {selectedUser.chuTro && (
                    <Chip size="sm" variant="soft" color="success" className="font-bold">
                      Chủ trọ
                    </Chip>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Email</span>
                <span className="font-semibold text-slate-700">{selectedUser.email}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Số điện thoại</span>
                <span className="font-semibold text-slate-700">{selectedUser.sdt}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block">CCCD</span>
                <span className="font-semibold text-slate-700">
                  {selectedUser.cccd || 'Chưa cập nhật'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Điểm uy tín</span>
                <span className="font-bold text-emerald-600">
                  {selectedUser.diemUyTin ?? 100} / 100
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL XÁC NHẬN ĐẶT LẠI MẬT KHẨU */}
      <Modal
        isOpen={!!resetTargetUser}
        onClose={() => setResetTargetUser(null)}
        title="Xác nhận đặt lại mật khẩu"
        maxWidth="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setResetTargetUser(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={resetPasswordMutation.isPending}
              onClick={() => resetTargetUser && resetPasswordMutation.mutate(resetTargetUser)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {resetPasswordMutation.isPending && <Spinner size="sm" color="current" />}
              Đặt lại mật khẩu
            </button>
          </>
        }
      >
        {resetTargetUser && (
          <p className="text-xs text-slate-600 leading-relaxed">
            Bạn có chắc chắn muốn đặt lại mật khẩu cho tài khoản{' '}
            <strong className="text-slate-900">{resetTargetUser.tenDangNhap}</strong> về mật khẩu mặc định{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-800">
              InnFinder@2026
            </code>{' '}
            không?
          </p>
        )}
      </Modal>

      {/* MODAL XÁC NHẬN KHÓA / MỞ KHÓA TÀI KHOẢN */}
      <Modal
        isOpen={!!lockTargetUser}
        onClose={() => setLockTargetUser(null)}
        title={
          lockTargetUser && (lockTargetUser.trangThai === 'KHOA' || lockTargetUser.trangThaiKhoa)
            ? 'Xác nhận mở khóa tài khoản'
            : 'Xác nhận khóa tài khoản'
        }
        subtitle={lockTargetUser ? `Mã định danh: ${lockTargetUser.maNguoiDung}` : undefined}
        maxWidth="sm"
        footer={
          lockTargetUser ? (
            <>
              <button
                type="button"
                onClick={() => setLockTargetUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={toggleLockMutation.isPending}
                onClick={() => toggleLockMutation.mutate(lockTargetUser)}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                  lockTargetUser.trangThai === 'KHOA' || lockTargetUser.trangThaiKhoa
                    ? 'bg-teal-600 hover:bg-teal-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {toggleLockMutation.isPending && <Spinner size="sm" color="current" />}
                {lockTargetUser.trangThai === 'KHOA' || lockTargetUser.trangThaiKhoa
                  ? 'Mở khóa tài khoản'
                  : 'Khóa tài khoản'}
              </button>
            </>
          ) : undefined
        }
      >
        {lockTargetUser && (() => {
          const isCurrentlyLocked =
            lockTargetUser.trangThai === 'KHOA' || lockTargetUser.trangThaiKhoa;
          return (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">
                  {lockTargetUser.hoVaTen || lockTargetUser.tenDangNhap}
                </div>
                <div className="text-slate-500">
                  @{lockTargetUser.tenDangNhap} • {lockTargetUser.email}
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {isCurrentlyLocked
                  ? 'Tài khoản này sẽ được khôi phục quyền đăng nhập và sử dụng toàn bộ chức năng trên InnFinder.'
                  : 'Sau khi khóa, người dùng sẽ bị chặn đăng nhập và không thể thực hiện bất kỳ thao tác nào trên hệ thống.'}
              </p>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL CHI TIẾT HỒ SƠ CHỦ TRỌ & CCCD */}
      <Modal
        isOpen={!!selectedLandlordRequest}
        onClose={() => setSelectedLandlordRequest(null)}
        title="Chi tiết hồ sơ xác thực Chủ trọ"
        subtitle={
          selectedLandlordRequest
            ? `Ứng viên: ${selectedLandlordRequest.hoVaTen}`
            : undefined
        }
        maxWidth="lg"
        footer={
          selectedLandlordRequest?.trangThai === 'CHO_DUYET' ? (
            <>
              <button
                type="button"
                disabled={approveLandlordMutation.isPending || rejectLandlordMutation.isPending}
                onClick={() => {
                  setRejectingRequest(selectedLandlordRequest);
                  setRejectReason('');
                }}
                className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold cursor-pointer"
              >
                Từ chối
              </button>
              <button
                type="button"
                disabled={approveLandlordMutation.isPending || rejectLandlordMutation.isPending}
                onClick={() =>
                  approveLandlordMutation.mutate(
                    selectedLandlordRequest.maYeuCau || selectedLandlordRequest.id,
                  )
                }
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {approveLandlordMutation.isPending && <Spinner size="sm" color="current" />}
                Phê duyệt Chủ trọ
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedLandlordRequest(null)}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Đóng
            </button>
          )
        }
      >
        {selectedLandlordRequest && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-sm text-slate-900">
                  {selectedLandlordRequest.hoVaTen}
                </div>
                <div className="text-slate-500 mt-0.5">
                  {selectedLandlordRequest.email} • {selectedLandlordRequest.sdt}
                </div>
                <div className="font-mono text-slate-800 mt-1">
                  Số CCCD: <strong>{selectedLandlordRequest.cccd}</strong>
                </div>
              </div>
              {renderLandlordStatusBadge(selectedLandlordRequest.trangThai)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mặt trước CCCD
                </span>
                <div className="h-40 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  {selectedLandlordRequest.anhCccdTruoc ? (
                    <a
                      href={selectedLandlordRequest.anhCccdTruoc}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={selectedLandlordRequest.anhCccdTruoc}
                        alt="CCCD Trước"
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      Không có ảnh
                    </div>
                  )}
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mặt sau CCCD
                </span>
                <div className="h-40 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  {selectedLandlordRequest.anhCccdSau ? (
                    <a
                      href={selectedLandlordRequest.anhCccdSau}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={selectedLandlordRequest.anhCccdSau}
                        alt="CCCD Sau"
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      Không có ảnh
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">
                  Tài khoản ngân hàng thụ hưởng
                </span>
                <span className="font-bold text-slate-900">
                  {selectedLandlordRequest.tenNganHang} - {selectedLandlordRequest.soTaiKhoan}
                </span>
                {selectedLandlordRequest.tenChuTaiKhoan && (
                  <span className="block text-[11px] text-slate-500 uppercase mt-0.5">
                    {selectedLandlordRequest.tenChuTaiKhoan}
                  </span>
                )}
              </div>
              <CreditCard className="w-5 h-5 text-slate-400 shrink-0" />
            </div>

            {selectedLandlordRequest.trangThai === 'TU_CHOI' && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <span className="font-bold block">Lý do từ chối:</span>
                  <span>
                    {selectedLandlordRequest.lyDoTuChoi ||
                      'Không đáp ứng điều kiện xác thực hồ sơ'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL TẠO TÀI KHOẢN QUẢN TRỊ VIÊN MỚI */}
      <Modal
        isOpen={showCreateAdminModal}
        onClose={() => setShowCreateAdminModal(false)}
        title="Tạo tài khoản Quản trị viên mới"
        subtitle="Tài khoản Quản trị viên được tạo độc lập, tách biệt hoàn toàn với tài khoản Khách hàng / Chủ trọ."
        maxWidth="lg"
      >
        <form
          onSubmit={handleSubmitCreateAdmin((values) => createAdminMutation.mutate(values))}
          noValidate
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên đăng nhập *</label>
              <input
                type="text"
                placeholder="VD: admin_vanhanh"
                {...registerCreateAdmin('tenDangNhap')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
              />
              {createAdminErrors.tenDangNhap && (
                <p className="text-[11px] text-red-600 mt-1">
                  {createAdminErrors.tenDangNhap.message}
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Họ và tên *</label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn Quản Trị"
                {...registerCreateAdmin('hoVaTen')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
              />
              {createAdminErrors.hoVaTen && (
                <p className="text-[11px] text-red-600 mt-1">
                  {createAdminErrors.hoVaTen.message}
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                placeholder="admin@innfinder.vn"
                {...registerCreateAdmin('email')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
              />
              {createAdminErrors.email && (
                <p className="text-[11px] text-red-600 mt-1">{createAdminErrors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số điện thoại *</label>
              <input
                type="tel"
                placeholder="0912345678"
                {...registerCreateAdmin('sdt')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
              />
              {createAdminErrors.sdt && (
                <p className="text-[11px] text-red-600 mt-1">{createAdminErrors.sdt.message}</p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mật khẩu tài khoản mới *
              </label>
              <div className="relative">
                <input
                  type={showNewAdminPwd ? 'text' : 'password'}
                  placeholder="Tối thiểu 8 ký tự"
                  {...registerCreateAdmin('matKhau')}
                  className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewAdminPwd((v) => !v)}
                  aria-label={showNewAdminPwd ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                  className="p-1 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewAdminPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {createAdminErrors.matKhau && (
                <p className="text-[11px] text-red-600 mt-1">
                  {createAdminErrors.matKhau.message}
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Xác nhận mật khẩu mới *
              </label>
              <div className="relative">
                <input
                  type={showConfirmAdminPwd ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu mới"
                  {...registerCreateAdmin('xacNhanMatKhau')}
                  className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmAdminPwd((v) => !v)}
                  aria-label={showConfirmAdminPwd ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                  className="p-1 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmAdminPwd ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {createAdminErrors.xacNhanMatKhau && (
                <p className="text-[11px] text-red-600 mt-1">
                  {createAdminErrors.xacNhanMatKhau.message}
                </p>
              )}
            </div>
          </div>

          {/* Xác thực lại mật khẩu Admin đang thao tác */}
          <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-teal-900">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Xác thực bảo mật Admin hiện tại</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Nhập lại mật khẩu tài khoản Quản trị viên bạn đang đăng nhập để xác nhận cấp quyền.
            </p>
            <div className="relative">
              <input
                type={showCurrentAdminPwd ? 'text' : 'password'}
                placeholder="Mật khẩu Admin hiện tại của bạn"
                {...registerCreateAdmin('matKhauAdminHienTai')}
                className="w-full pl-3 pr-9 py-2 rounded-xl border border-teal-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600"
              />
              <button
                type="button"
                onClick={() => setShowCurrentAdminPwd((v) => !v)}
                aria-label={showCurrentAdminPwd ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                className="p-1 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showCurrentAdminPwd ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {createAdminErrors.matKhauAdminHienTai && (
              <p className="text-[11px] text-red-600">
                {createAdminErrors.matKhauAdminHienTai.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateAdminModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createAdminMutation.isPending}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {createAdminMutation.isPending && <Spinner size="sm" color="current" />}
              Tạo Quản trị viên
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL TỪ CHỐI HỒ SƠ CHỦ TRỌ */}
      <Modal
        isOpen={!!rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        title="Từ chối hồ sơ Chủ trọ"
        subtitle={rejectingRequest ? `Ứng viên: ${rejectingRequest.hoVaTen}` : undefined}
        maxWidth="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRejectingRequest(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={rejectLandlordMutation.isPending}
              onClick={handleConfirmRejectLandlord}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {rejectLandlordMutation.isPending && <Spinner size="sm" color="current" />}
              Xác nhận từ chối
            </button>
          </>
        }
      >
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Lý do từ chối (gửi thông báo tới người dùng)
          </label>
          <textarea
            rows={3}
            placeholder="VD: Ảnh CCCD bị mờ, thông tin chủ tài khoản ngân hàng không trùng khớp..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
          />
        </div>
      </Modal>
    </div>
  );
};
