import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Chip, Spinner } from '@heroui/react';
import {
  Search,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Eye,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Modal } from '@/components/common/Modal';
import { formatDateTime } from '@/utils/formatters';
import type { AdminUserItem, AdminLandlordRequestItem } from '@/types/admin.types';
import type { TrangThaiYeuCauChuTro } from '@/types/auth-user.types';

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'USERS' | 'LANDLORD_REQUESTS'>('USERS');
  const [searchInput, setSearchInput] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(0);

  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [resetTargetUser, setResetTargetUser] = useState<AdminUserItem | null>(null);

  // Modal từ chối chủ trọ
  const [rejectingRequest, setRejectingRequest] = useState<AdminLandlordRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: usersPage, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin', 'users', submittedKeyword, page],
    queryFn: () => adminService.getUsers(submittedKeyword, page, 15),
  });

  const { data: landlordRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['admin', 'landlord-requests'],
    queryFn: () => adminService.getLandlordRequests(),
  });

  const toggleLockMutation = useMutation({
    mutationFn: (userItem: AdminUserItem) => adminService.toggleLockUser(userItem.maNguoiDung),
    onSuccess: (_data, userItem) => {
      const isNowLocked = !(userItem.trangThai === 'KHOA' || userItem.trangThaiKhoa);
      toast.success(
        isNowLocked
          ? `Đã khóa tài khoản ${userItem.tenDangNhap}`
          : `Đã mở khóa tài khoản ${userItem.tenDangNhap}`,
      );
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

  const approveLandlordMutation = useMutation({
    mutationFn: (id: string | number) => adminService.approveLandlordRequest(id),
    onSuccess: () => {
      toast.success('Đã duyệt hồ sơ Chủ trọ thành công!');
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

  const handleConfirmRejectLandlord = () => {
    if (!rejectingRequest) return;
    const trimmedReason =
      rejectReason.trim() || 'Ảnh CCCD không rõ hoặc số tài khoản ngân hàng không trùng khớp';
    rejectLandlordMutation.mutate({ id: rejectingRequest.id, reason: trimmedReason });
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
  const totalPages = Math.max(usersPage?.totalPages ?? 1, 1);
  const pendingLandlordCount = landlordRequests.filter((r) => r.trangThai === 'CHO_DUYET').length;

  return (
    <div className="space-y-6">
      {/* Title & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý Tài khoản & Phân quyền
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi danh sách thành viên (`NguoiDung`), kiểm duyệt CCCD Chủ trọ (`YeuCauChuTro`) và kiểm soát truy cập
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('USERS')}
            className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'USERS'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả người dùng
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LANDLORD_REQUESTS')}
            className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'LANDLORD_REQUESTS'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
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
      </div>

      {activeTab === 'USERS' ? (
        /* TAB 1: DANH SÁCH NGƯỜI DÙNG */
        <Card className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-0">
          <Card.Header className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearch} className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên, email, SĐT, CCCD..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </form>
            <span className="text-xs text-slate-500">
              Trang {page + 1} / {totalPages}
            </span>
          </Card.Header>

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
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Spinner size="md" className="mx-auto mb-2" />
                      <div className="mt-2">Đang tải danh sách người dùng...</div>
                    </td>
                  </tr>
                ) : users.length > 0 ? (
                  users.map((u) => {
                    const isLocked = u.trangThai === 'KHOA' || u.trangThaiKhoa;
                    return (
                      <tr key={u.maNguoiDung} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
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
                              {u.vaiTro}
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
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
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
                            <button
                              type="button"
                              disabled={toggleLockMutation.isPending}
                              onClick={() => toggleLockMutation.mutate(u)}
                              title={isLocked ? 'Mở khóa' : 'Khóa tài khoản'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isLocked
                                  ? 'text-red-600 hover:bg-emerald-50 hover:text-emerald-600'
                                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                            >
                              {isLocked ? (
                                <Unlock className="w-4 h-4" />
                              ) : (
                                <Lock className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      Không tìm thấy tài khoản người dùng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card.Content>

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
        </Card>
      ) : (
        /* TAB 2: DUYỆT CCCD CHỦ TRỌ (CHO_DUYET / DA_DUYET / TU_CHOI) */
        <div className="space-y-4">
          {isLoadingRequests ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
              <Spinner size="lg" />
              <p className="text-xs text-slate-500 mt-3">
                Đang tải danh sách yêu cầu nâng cấp Chủ trọ...
              </p>
            </div>
          ) : landlordRequests.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {landlordRequests.map((req) => (
                <Card
                  key={req.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4"
                >
                  <Card.Header className="p-0 flex flex-row items-start justify-between gap-3">
                    <div>
                      <Card.Title className="text-sm font-bold text-slate-900">
                        {req.hoVaTen}
                      </Card.Title>
                      <Card.Description className="text-xs text-slate-500">
                        {req.email} • {req.sdt}
                      </Card.Description>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-700 font-mono">
                        <span>
                          CCCD: <strong>{req.cccd}</strong>
                        </span>
                        {req.ngayGui && (
                          <span className="text-[11px] text-slate-400 font-sans">
                            • Gửi: {formatDateTime(req.ngayGui)}
                          </span>
                        )}
                      </div>
                    </div>
                    {renderLandlordStatusBadge(req.trangThai)}
                  </Card.Header>

                  <Card.Content className="p-0 space-y-3">
                    {/* 2 Photos CCCD */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Mặt trước CCCD
                        </span>
                        <div className="h-28 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                          {req.anhCccdTruoc ? (
                            <a href={req.anhCccdTruoc} target="_blank" rel="noreferrer">
                              <img
                                src={req.anhCccdTruoc}
                                alt="CCCD Trước"
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                              Không có ảnh
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Mặt sau CCCD
                        </span>
                        <div className="h-28 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                          {req.anhCccdSau ? (
                            <a href={req.anhCccdSau} target="_blank" rel="noreferrer">
                              <img
                                src={req.anhCccdSau}
                                alt="CCCD Sau"
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                              Không có ảnh
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bank info */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          Tài khoản ngân hàng thụ hưởng
                        </span>
                        <span className="font-bold text-slate-800">
                          {req.tenNganHang} - {req.soTaiKhoan}
                        </span>
                        {req.tenChuTaiKhoan && (
                          <span className="block text-[10px] text-slate-500 uppercase">
                            {req.tenChuTaiKhoan}
                          </span>
                        )}
                      </div>
                      <CreditCard className="w-5 h-5 text-slate-400 shrink-0" />
                    </div>

                    {/* Hiển thị lý do từ chối nếu trạng thái là TU_CHOI */}
                    {req.trangThai === 'TU_CHOI' && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        <div>
                          <span className="font-bold block">Lý do từ chối:</span>
                          <span>{req.lyDoTuChoi || 'Không đáp ứng điều kiện xác thực hồ sơ'}</span>
                        </div>
                      </div>
                    )}
                  </Card.Content>

                  {/* Chỉ hiển thị nút Duyệt / Từ chối khi trạng thái là CHO_DUYET */}
                  {req.trangThai === 'CHO_DUYET' && (
                    <Card.Footer className="p-0 pt-1 flex gap-2">
                      <button
                        type="button"
                        disabled={approveLandlordMutation.isPending || rejectLandlordMutation.isPending}
                        onClick={() => {
                          setRejectingRequest(req);
                          setRejectReason('');
                        }}
                        className="w-1/2 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        disabled={approveLandlordMutation.isPending || rejectLandlordMutation.isPending}
                        onClick={() => approveLandlordMutation.mutate(req.id)}
                        className="w-1/2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Phê duyệt Chủ trọ
                      </button>
                    </Card.Footer>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Card.Content className="p-0">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Hàng đợi trống</h4>
                <p className="text-[11px] text-slate-400">
                  Không có hồ sơ đăng ký làm Chủ trọ nào trong hệ thống lúc này.
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
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xl overflow-hidden shrink-0">
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
                    {selectedUser.vaiTro}
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

      {/* MODAL XÁC NHẬN ĐẶT LẠI MẬT KHẨU (Thay thế window.confirm) */}
      <Modal
        isOpen={!!resetTargetUser}
        onClose={() => setResetTargetUser(null)}
        title="Xác nhận đặt lại mật khẩu"
        subtitle="Thao tác quản trị bảo mật tài khoản người dùng"
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
