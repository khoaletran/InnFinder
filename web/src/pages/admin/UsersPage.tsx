import React, { useState, useEffect } from 'react';
import {
  Search,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Eye,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import type { AdminUserItem, AdminLandlordRequestItem } from '../../types/admin.types';
import { toast } from 'sonner';

export const UsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'LANDLORD_REQUESTS'>('USERS');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [landlordRequests, setLandlordRequests] = useState<AdminLandlordRequestItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);

  // Modal từ chối chủ trọ
  const [rejectingRequestId, setRejectingRequestId] = useState<string | number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (activeTab === 'USERS') {
      loadUsers();
    } else {
      loadLandlordRequests();
    }
  }, [activeTab, page]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const res = await adminService.getUsers(keyword, page, 15);
      setUsers(res.content);
      setTotalPages(res.totalPages);
    } catch {
      toast.error('Lỗi tải danh sách người dùng');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLandlordRequests = async () => {
    try {
      setIsLoading(true);
      const res = await adminService.getLandlordRequests();
      setLandlordRequests(res);
    } catch {
      toast.error('Lỗi tải danh sách yêu cầu xác thực Chủ trọ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadUsers();
  };

  const handleToggleLock = async (userItem: AdminUserItem) => {
    try {
      await adminService.toggleLockUser(userItem.maNguoiDung);
      const isNowLocked = !(userItem.trangThai === 'KHOA' || userItem.trangThaiKhoa);
      toast.success(
        isNowLocked
          ? `Đã khóa tài khoản ${userItem.tenDangNhap}`
          : `Đã mở khóa tài khoản ${userItem.tenDangNhap}`
      );
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thao tác');
    }
  };

  const handleResetPassword = async (userItem: AdminUserItem) => {
    if (!window.confirm(`Bạn có chắc muốn đặt lại mật khẩu cho ${userItem.tenDangNhap}?`)) return;
    try {
      await adminService.resetUserPassword(userItem.maNguoiDung);
      toast.success(`Đã đặt lại mật khẩu mặc định (InnFinder@2026) cho ${userItem.tenDangNhap}!`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi đặt lại mật khẩu');
    }
  };

  const handleApproveLandlord = async (id: string | number) => {
    try {
      await adminService.approveLandlordRequest(id);
      toast.success('Đã duyệt hồ sơ Chủ trọ thành công!');
      loadLandlordRequests();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi phê duyệt');
    }
  };

  const handleRejectLandlord = async () => {
    if (!rejectingRequestId) return;
    try {
      await adminService.rejectLandlordRequest(rejectingRequestId, rejectReason || 'Ảnh CCCD không rõ hoặc số tài khoản không chính chủ');
      toast.success('Đã từ chối đơn đăng ký làm Chủ trọ!');
      setRejectingRequestId(null);
      setRejectReason('');
      loadLandlordRequests();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi từ chối');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý Tài khoản & Phân quyền</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi danh sách thành viên, kiểm duyệt CCCD và kiểm soát trạng thái truy cập hệ thống
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'USERS' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả người dùng
          </button>
          <button
            onClick={() => setActiveTab('LANDLORD_REQUESTS')}
            className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'LANDLORD_REQUESTS' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Duyệt CCCD Chủ trọ
            {landlordRequests.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-500 text-white rounded-full text-[10px]">
                {landlordRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'USERS' ? (
        /* TAB 1: DANH SÁCH NGƯỜI DÙNG */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Search Header */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearch} className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên, email, SĐT, CCCD..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </form>
            <span className="text-xs text-slate-500">
              Hiển thị trang {page + 1} / {totalPages}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
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
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      Đang tải danh sách người dùng...
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
                                <img src={u.avatarUrl || u.hinhDaiDien} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (u.hoVaTen || u.tenDangNhap || 'U').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{u.hoVaTen || u.tenDangNhap}</div>
                              <code className="text-[10px] text-slate-400 font-mono">{u.maNguoiDung}</code>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{u.email}</div>
                          <div className="text-[11px] text-slate-400">{u.sdt}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {u.cccd || '--'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                u.vaiTro === 'QUAN_TRI'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {u.vaiTro}
                            </span>
                            {u.chuTro && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Chủ trọ
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isLocked ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              Đã khóa
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Hoạt động
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedUser(u)}
                              title="Xem chi tiết"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleResetPassword(u)}
                              title="Đặt lại mật khẩu"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleLock(u)}
                              title={isLocked ? 'Mở khóa' : 'Khóa tài khoản'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isLocked
                                  ? 'text-red-600 hover:bg-emerald-50 hover:text-emerald-600'
                                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                            >
                              {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Không tìm thấy tài khoản người dùng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Trang trước
            </button>
            <span className="text-slate-500 font-medium">Trang {page + 1} / {totalPages}</span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        </div>
      ) : (
        /* TAB 2: DUYỆT CCCD CHỦ TRỌ */
        <div className="space-y-4">
          {landlordRequests.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {landlordRequests.map((req) => (
                <div key={req.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{req.hoVaTen}</h3>
                      <p className="text-xs text-slate-500">{req.email} • {req.sdt}</p>
                      <p className="text-xs text-slate-700 font-mono mt-1">
                        CCCD: <strong>{req.cccd}</strong>
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Chờ duyệt
                    </span>
                  </div>

                  {/* 2 Photos CCCD */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 mb-1">Mặt trước CCCD</span>
                      <div className="h-28 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                        {req.anhCccdTruoc ? (
                          <img src={req.anhCccdTruoc} alt="CCCD Trước" className="w-full h-full object-cover" />
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-400 text-xs">Không có ảnh</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 mb-1">Mặt sau CCCD</span>
                      <div className="h-28 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                        {req.anhCccdSau ? (
                          <img src={req.anhCccdSau} alt="CCCD Sau" className="w-full h-full object-cover" />
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-400 text-xs">Không có ảnh</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bank info */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Tài khoản ngân hàng thụ hưởng</span>
                      <span className="font-bold text-slate-800">{req.tenNganHang} - {req.soTaiKhoan}</span>
                      {req.tenChuTaiKhoan && <span className="block text-[10px] text-slate-500 uppercase">{req.tenChuTaiKhoan}</span>}
                    </div>
                    <CreditCard className="w-5 h-5 text-slate-400" />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setRejectingRequestId(req.id)}
                      className="w-1/2 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Từ chối
                    </button>
                    <button
                      onClick={() => handleApproveLandlord(req.id)}
                      className="w-1/2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Phê duyệt Chủ trọ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-700">Hàng đợi trống</h4>
              <p className="text-[11px] text-slate-400">Không có đơn đăng ký làm Chủ trọ nào cần duyệt lúc này.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL CHI TIẾT NGƯỜI DÙNG */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Hồ sơ chi tiết thành viên</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xl overflow-hidden shrink-0">
                {selectedUser.avatarUrl || selectedUser.hinhDaiDien ? (
                  <img src={selectedUser.avatarUrl || selectedUser.hinhDaiDien} alt="" className="w-full h-full object-cover" />
                ) : (
                  (selectedUser.hoVaTen || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">{selectedUser.hoVaTen || selectedUser.tenDangNhap}</h4>
                <p className="text-xs text-slate-500 font-mono">{selectedUser.maNguoiDung}</p>
                <div className="flex gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                    {selectedUser.vaiTro}
                  </span>
                  {selectedUser.chuTro && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      Chủ trọ
                    </span>
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
                <span className="font-semibold text-slate-700">{selectedUser.cccd || 'Chưa cập nhật'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Điểm uy tín</span>
                <span className="font-bold text-emerald-600">{selectedUser.diemUyTin ?? 100} / 100</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TỪ CHỐI CHỦ TRỌ */}
      {rejectingRequestId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Lý do từ chối hồ sơ Chủ trọ</h3>
            <textarea
              rows={3}
              placeholder="VD: Ảnh CCCD bị mờ, thông tin ngân hàng không trùng khớp..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-100 focus:border-red-500 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectingRequestId(null)}
                className="w-1/2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Hủy
              </button>
              <button
                onClick={handleRejectLandlord}
                className="w-1/2 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
