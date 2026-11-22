import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Chip, Spinner } from '@heroui/react';
import { CheckCircle2, Clock, XCircle, Eye, MapPin, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Modal } from '@/components/common/Modal';
import { StatusTabBar } from '@/components/common/StatusTabBar';
import {
  AdminErrorState,
  AdminRefreshButton,
  AdminTableSkeleton,
} from '@/components/common/AdminStates';
import { formatVND } from '@/utils/formatters';
import type { AdminPostItem } from '@/types/admin.types';
import type { TrangThaiPhongTro } from '@/types/room.types';

export const PostsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TrangThaiPhongTro>('CHO_DUYET');
  const [previewRoom, setPreviewRoom] = useState<AdminPostItem | null>(null);

  const [rejectingRoomId, setRejectingRoomId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const {
    data: allRooms = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'rooms', 'all'],
    queryFn: () => adminService.getAllRooms(),
  });

  const handleRefresh = () => {
    void refetch();
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminService.approveRoom(id),
    onSuccess: () => {
      toast.success('Phê duyệt bài đăng thành công! Phòng đã được hiển thị công khai.');
      setPreviewRoom(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi phê duyệt bài đăng');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminService.rejectRoom(id, reason),
    onSuccess: () => {
      toast.success('Đã từ chối bài đăng và gửi thông báo tới Chủ trọ');
      setRejectingRoomId(null);
      setRejectReason('');
      setPreviewRoom(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi từ chối bài đăng');
    },
  });

  const handleConfirmReject = () => {
    if (!rejectingRoomId) return;
    const reason =
      rejectReason.trim() ||
      'Thông tin phòng hoặc hình ảnh không đáp ứng tiêu chuẩn kiểm duyệt của sàn';
    rejectMutation.mutate({ id: rejectingRoomId, reason });
  };

  const renderRoomStatusChip = (status: TrangThaiPhongTro) => {
    switch (status) {
      case 'CHO_DUYET':
        return (
          <Chip size="sm" variant="soft" color="warning" className="font-bold whitespace-nowrap">
            Chờ duyệt
          </Chip>
        );
      case 'DA_DUYET':
        return (
          <Chip size="sm" variant="soft" color="success" className="font-bold whitespace-nowrap">
            Đã duyệt
          </Chip>
        );
      case 'HOAN_THANH':
        return (
          <Chip size="sm" variant="soft" color="accent" className="font-bold whitespace-nowrap">
            Đã thuê
          </Chip>
        );
      case 'HUY':
        return (
          <Chip size="sm" variant="soft" color="danger" className="font-bold whitespace-nowrap">
            Đã hủy / Từ chối
          </Chip>
        );
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<TrangThaiPhongTro, number> = {
      CHO_DUYET: 0,
      DA_DUYET: 0,
      HOAN_THANH: 0,
      HUY: 0,
    };
    for (const room of allRooms) {
      if (room.trangThai && room.trangThai in counts) {
        counts[room.trangThai]++;
      }
    }
    return counts;
  }, [allRooms]);

  const currentList = allRooms.filter((r) => r.trangThai === statusFilter);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Kiểm duyệt Bài đăng Phòng trọ
        </h1>

        <AdminRefreshButton onClick={handleRefresh} isRefreshing={isFetching} />
      </div>

      {/* Status Tab Bar (giống mẫu tab Lịch xem phòng) */}
      <StatusTabBar
        ariaLabel="Lọc bài đăng theo trạng thái"
        activeKey={statusFilter}
        onChange={setStatusFilter}
        tabs={[
          { key: 'CHO_DUYET', label: 'Chờ duyệt', count: statusCounts.CHO_DUYET, icon: Clock },
          {
            key: 'DA_DUYET',
            label: 'Đã duyệt',
            count: statusCounts.DA_DUYET,
            icon: CheckCircle2,
          },
          {
            key: 'HOAN_THANH',
            label: 'Đã thuê',
            count: statusCounts.HOAN_THANH,
            icon: ShieldCheck,
          },
          {
            key: 'HUY',
            label: 'Đã hủy / Từ chối',
            count: statusCounts.HUY,
            icon: XCircle,
          },
        ]}
      />

      {/* Main Table Card */}
      {isError ? (
        <AdminErrorState
          title="Không thể tải danh sách bài đăng phòng trọ"
          message={error instanceof Error ? error.message : undefined}
          onRetry={handleRefresh}
        />
      ) : (
        <Card className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-0">
          <Card.Content className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Mã & Phòng trọ</th>
                  <th className="py-3 px-4 whitespace-nowrap">Giá thuê / Tháng</th>
                  <th className="py-3 px-4 whitespace-nowrap">Địa chỉ</th>
                  <th className="py-3 px-4 whitespace-nowrap">Chủ trọ</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <AdminTableSkeleton rows={6} cols={5} />
                ) : currentList.length > 0 ? (
                  currentList.map((room) => {
                    const coverImg =
                      room.hinhAnh?.[0] ||
                      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500';
                    const displayTitle = room.tieuDe || `Phòng #${room.maPhongTro}`;
                    return (
                      <tr key={room.maPhongTro} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 min-w-[260px]">
                          <div className="flex items-center gap-3">
                            <img
                              src={coverImg}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <div
                                title={displayTitle}
                                className="font-bold text-slate-900 max-w-xs truncate"
                              >
                                {displayTitle}
                              </div>
                              <code className="text-[10px] text-teal-700 font-mono">
                                {room.maPhongTro}
                              </code>
                              <div className="text-[10px] text-slate-400 whitespace-nowrap">
                                {room.dienTich} m² • {room.soNguoi} người
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                          <div className="font-bold text-teal-700">{formatVND(room.giaThue)}</div>
                          <div className="text-[10px] text-slate-400 whitespace-nowrap">
                            Cọc HĐ: {formatVND(room.cocPhong)}
                          </div>
                        </td>
                        <td
                          title={room.diaChi}
                          className="py-3 px-4 text-slate-600 max-w-[240px] truncate"
                        >
                          {room.diaChi}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 whitespace-nowrap">
                            {room.tenChuTro || 'Chủ trọ'}
                          </div>
                          <div className="text-[10px] text-slate-400 whitespace-nowrap">
                            {room.sdtChuTro}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap w-px">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewRoom(room)}
                              title="Xem chi tiết kiểm duyệt"
                              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {room.trangThai === 'CHO_DUYET' && (
                              <>
                                <button
                                  type="button"
                                  disabled={approveMutation.isPending}
                                  onClick={() => approveMutation.mutate(room.maPhongTro)}
                                  title="Phê duyệt bài đăng"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingRoomId(room.maPhongTro);
                                    setRejectReason('');
                                  }}
                                  title="Từ chối duyệt"
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Không có bài đăng nào trong danh sách này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      )}

      {/* MODAL CHI TIẾT DUYỆT BÀI ĐĂNG */}
      <Modal
        isOpen={!!previewRoom}
        onClose={() => setPreviewRoom(null)}
        title={previewRoom ? previewRoom.tieuDe || `Phòng #${previewRoom.maPhongTro}` : 'Chi tiết bài đăng'}
        subtitle={previewRoom ? `Mã phòng trọ: ${previewRoom.maPhongTro}` : undefined}
        maxWidth="2xl"
        footer={
          previewRoom?.trangThai === 'CHO_DUYET' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setRejectingRoomId(previewRoom.maPhongTro);
                  setRejectReason('');
                }}
                className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold cursor-pointer"
              >
                Từ chối duyệt bài
              </button>
              <button
                type="button"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate(previewRoom.maPhongTro)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {approveMutation.isPending && <Spinner size="sm" color="current" />}
                Phê duyệt hiển thị
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setPreviewRoom(null)}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
            >
              Đóng
            </button>
          )
        }
      >
        {previewRoom && (
          <div className="space-y-4">
            {/* Photo Gallery */}
            <div>
              <span className="block text-xs font-bold text-slate-700 mb-2">
                Hình ảnh chụp thực tế ({previewRoom.hinhAnh?.length || 0} ảnh)
              </span>
              <div className="grid grid-cols-3 gap-2">
                {previewRoom.hinhAnh?.map((img, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl border border-slate-200 overflow-hidden bg-slate-50"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Giá thuê</span>
                <span className="font-bold text-teal-700">
                  {formatVND(previewRoom.giaThue)} / tháng
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Cọc hợp đồng</span>
                <span className="font-bold text-slate-800">{formatVND(previewRoom.cocPhong)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Diện tích</span>
                <span className="font-bold text-slate-800">{previewRoom.dienTich} m²</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Số người ở</span>
                <span className="font-bold text-slate-800">{previewRoom.soNguoi} người</span>
              </div>
            </div>

            {/* Address & GPS */}
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                <span>{previewRoom.diaChi}</span>
              </div>
              {previewRoom.kinhDo && previewRoom.viDo && (
                <div className="text-[11px] text-slate-400 font-mono">
                  Tọa độ GPS: ({previewRoom.kinhDo}, {previewRoom.viDo})
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <span className="block text-xs font-bold text-slate-700 mb-1">
                Mô tả chi tiết phòng trọ
              </span>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                {previewRoom.moTa || 'Chưa có mô tả chi tiết'}
              </p>
            </div>

            {/* Landlord Info */}
            <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs">
                  CT
                </div>
                <div>
                  <span className="font-bold text-slate-900">{previewRoom.tenChuTro}</span>
                  <div className="text-slate-500 text-[11px]">{previewRoom.sdtChuTro}</div>
                </div>
              </div>
              {renderRoomStatusChip(previewRoom.trangThai)}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL TỪ CHỐI BÀI ĐĂNG KÈM LÝ DO */}
      <Modal
        isOpen={!!rejectingRoomId}
        onClose={() => setRejectingRoomId(null)}
        title="Từ chối bài đăng phòng trọ"
        subtitle="Bài đăng sẽ chuyển sang trạng thái đã từ chối và gửi thông báo tới Chủ trọ."
        maxWidth="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRejectingRoomId(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={rejectMutation.isPending}
              onClick={handleConfirmReject}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {rejectMutation.isPending && <Spinner size="sm" color="current" />}
              Xác nhận từ chối
            </button>
          </>
        }
      >
        <textarea
          rows={3}
          placeholder="VD: Giá thuê không nhất quán, hình ảnh chụp bị mờ, địa chỉ không rõ ràng..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
        />
      </Modal>
    </div>
  );
};
