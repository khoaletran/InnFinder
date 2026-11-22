import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Spinner } from '@heroui/react';
import { Coins, Edit3, Layers, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { roomService } from '@/services/room.service';
import { Modal } from '@/components/common/Modal';
import {
  AdminErrorState,
  AdminRefreshButton,
  AdminTableSkeleton,
} from '@/components/common/AdminStates';
import { formatVND } from '@/utils/formatters';
import { categoryDepositFeeSchema } from '@/utils/validators';
import type { RoomTypeDepositFee } from '@/types/admin.types';
import type { AmenityResponse, CategoryResponse } from '@/types/room.types';

type ActiveTab = 'DEPOSIT_FEES' | 'ROOM_TYPES' | 'AMENITIES';

export const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('DEPOSIT_FEES');

  // Modal chỉnh sửa Biểu phí Cọc & Hoa hồng
  const [editingFeeItem, setEditingFeeItem] = useState<RoomTypeDepositFee | null>(null);
  const [editCoc, setEditCoc] = useState<number>(0);
  const [editPhi, setEditPhi] = useState<number>(0);
  const [feeError, setFeeError] = useState<string>('');

  // Modal chỉnh sửa Loại phòng trọ
  const [editingRoomType, setEditingRoomType] = useState<{
    code: string;
    ten: string;
    moTa: string;
  } | null>(null);

  // Modal chỉnh sửa Tiện ích
  const [editingAmenity, setEditingAmenity] = useState<AmenityResponse | null>(null);
  const [amenityName, setAmenityName] = useState('');
  const [amenityDesc, setAmenityDesc] = useState('');

  const {
    data: apiDepositFees = [],
    isLoading: isLoadingFees,
    isFetching: isFetchingFees,
    isError: isErrorFees,
    error: errorFees,
    refetch: refetchFees,
  } = useQuery({
    queryKey: ['admin', 'deposit-fees'],
    queryFn: () => adminService.getRoomTypeDepositFees(),
  });

  const {
    data: apiRoomTypes = [],
    isLoading: isLoadingRoomTypes,
    isFetching: isFetchingRoomTypes,
    isError: isErrorRoomTypes,
    error: errorRoomTypes,
    refetch: refetchRoomTypes,
  } = useQuery({
    queryKey: ['categories', 'room-types'],
    queryFn: () => roomService.getRoomTypes(),
  });

  const {
    data: apiAmenities = [],
    isLoading: isLoadingAmenities,
    isFetching: isFetchingAmenities,
    isError: isErrorAmenities,
    error: errorAmenities,
    refetch: refetchAmenities,
  } = useQuery({
    queryKey: ['categories', 'amenities'],
    queryFn: () => roomService.getAmenities(),
  });

  const handleRefresh = () => {
    void refetchFees();
    void refetchRoomTypes();
    void refetchAmenities();
  };

  const updateDepositFeeMutation = useMutation({
    mutationFn: ({
      maLpt,
      soTienCoc,
      phiThu,
    }: {
      maLpt: string;
      soTienCoc: number;
      phiThu: number;
    }) => adminService.updateDepositFee(maLpt, { soTienCoc, phiThu }),
    onSuccess: (_res, vars) => {
      toast.success(`Cập nhật biểu phí cọc & hoa hồng cho mã ${vars.maLpt} thành công!`);
      setEditingFeeItem(null);
      setFeeError('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'deposit-fees'] });
      void queryClient.invalidateQueries({ queryKey: ['categories', 'room-types'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật biểu phí');
    },
  });

  const updateRoomTypeMutation = useMutation({
    mutationFn: ({ maLpt, ten, moTa }: { maLpt: string; ten: string; moTa?: string }) =>
      adminService.updateRoomType(maLpt, { ten, moTa }),
    onSuccess: (_res, vars) => {
      toast.success(`Đã cập nhật loại phòng ${vars.ten} (${vars.maLpt})`);
      setEditingRoomType(null);
      void queryClient.invalidateQueries({ queryKey: ['categories', 'room-types'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'deposit-fees'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật loại phòng');
    },
  });

  const updateAmenityMutation = useMutation({
    mutationFn: ({ maTienIch, ten, moTa }: { maTienIch: string; ten: string; moTa?: string }) =>
      adminService.updateAmenity(maTienIch, { ten, moTa }),
    onSuccess: (_res, vars) => {
      toast.success(`Đã cập nhật tiện ích ${vars.ten} (${vars.maTienIch})`);
      setEditingAmenity(null);
      void queryClient.invalidateQueries({ queryKey: ['categories', 'amenities'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật tiện ích');
    },
  });

  const normalizedRoomTypes: Array<{ code: string; ten: string; moTa: string }> = apiRoomTypes.map(
    (rt: CategoryResponse, idx: number) => ({
      code: rt.maLpt || rt.maLoaiPhong || `LPT${String(idx + 1).padStart(3, '0')}`,
      ten: rt.tenLoaiPhongTro || rt.tenLoaiPhong || `Loại phòng ${idx + 1}`,
      moTa: rt.moTa || '',
    }),
  );

  const handleStartEditFee = (item: RoomTypeDepositFee) => {
    setEditingFeeItem(item);
    setEditCoc(item.soTienCoc);
    setEditPhi(item.phiThu);
    setFeeError('');
  };

  const handleSaveFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeeItem) return;

    const parsed = categoryDepositFeeSchema.safeParse({
      soTienCoc: Number(editCoc),
      phiThu: Number(editPhi),
    });

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Dữ liệu biểu phí không hợp lệ';
      setFeeError(msg);
      toast.error(msg);
      return;
    }

    updateDepositFeeMutation.mutate({
      maLpt: editingFeeItem.maLoaiPhong,
      soTienCoc: parsed.data.soTienCoc,
      phiThu: parsed.data.phiThu,
    });
  };

  const handleSaveRoomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoomType) return;
    if (!editingRoomType.ten.trim()) {
      toast.error('Tên loại phòng không được để trống');
      return;
    }
    updateRoomTypeMutation.mutate({
      maLpt: editingRoomType.code,
      ten: editingRoomType.ten.trim(),
      moTa: editingRoomType.moTa.trim() || undefined,
    });
  };

  const handleSaveAmenity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAmenity) return;
    if (!amenityName.trim()) {
      toast.error('Tên tiện ích không được để trống');
      return;
    }
    updateAmenityMutation.mutate({
      maTienIch: editingAmenity.maTienIch,
      ten: amenityName.trim(),
      moTa: amenityDesc.trim() || undefined,
    });
  };

  const isRefreshing = isFetchingFees || isFetchingRoomTypes || isFetchingAmenities;

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      {/* Title & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text tracking-[-0.01em]">
          Quản lý Danh mục & Biểu phí Sàn
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap rounded-lg bg-surface-muted p-1 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('DEPOSIT_FEES')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'DEPOSIT_FEES'
                  ? 'bg-surface text-tone-teal-strong font-semibold shadow-[var(--shadow-tab-active)]'
                  : 'text-text-muted hover:text-text font-medium'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              Biểu phí Cọc & Hoa hồng
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ROOM_TYPES')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'ROOM_TYPES'
                  ? 'bg-surface text-tone-teal-strong font-semibold shadow-[var(--shadow-tab-active)]'
                  : 'text-text-muted hover:text-text font-medium'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Loại phòng ({normalizedRoomTypes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('AMENITIES')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'AMENITIES'
                  ? 'bg-surface text-tone-teal-strong font-semibold shadow-[var(--shadow-tab-active)]'
                  : 'text-text-muted hover:text-text font-medium'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tiện ích ({apiAmenities.length})
            </button>
          </div>

          <AdminRefreshButton onClick={handleRefresh} isRefreshing={isRefreshing} />
        </div>
      </div>

      {activeTab === 'DEPOSIT_FEES' &&
        (isErrorFees ? (
          <AdminErrorState
            title="Không thể tải biểu phí cọc giữ chân"
            message={errorFees instanceof Error ? errorFees.message : undefined}
            onRetry={() => void refetchFees()}
          />
        ) : (
          <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
            <Card.Content className="p-0 overflow-x-auto">
              <table aria-label="Danh mục và biểu phí" className="w-full text-left text-xs">
                <thead className="bg-tone-slate-soft border-b border-border text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-4">Mã & Loại phòng trọ</th>
                    <th scope="col" className="py-3 px-4">Mô tả đặc trưng</th>
                    <th scope="col" className="py-3 px-4 text-right">Cọc giữ chân</th>
                    <th scope="col" className="py-3 px-4 text-right">Hoa hồng sàn</th>
                    <th scope="col" className="py-3 px-4 text-right">Chủ trọ thực nhận</th>
                    <th scope="col" className="py-3 px-4 text-right">Điều chỉnh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {isLoadingFees ? (
                    <AdminTableSkeleton rows={5} cols={6} />
                  ) : apiDepositFees.length > 0 ? (
                    apiDepositFees.map((f) => (
                      <tr key={f.maLoaiPhong} className="hover:bg-tone-teal-soft/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-medium text-text block">{f.tenLoaiPhong}</span>
                          <span className="inline-block font-mono text-[11px] text-text-muted bg-surface-muted px-2 py-0.5 rounded-md mt-1">
                            {f.maLoaiPhong}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-text-secondary max-w-xs">{f.moTa || '--'}</td>
                        <td className="py-3 px-4 text-right font-semibold text-tone-amber-strong text-[13px] tabular-nums">
                          {formatVND(f.soTienCoc)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-semibold text-[13px] tabular-nums ${
                            f.phiThu > 0 ? 'text-tone-teal-base' : 'text-text-muted'
                          }`}
                        >
                          {formatVND(f.phiThu)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-tone-blue-base text-[13px] tabular-nums">
                          {formatVND(Math.max(f.soTienCoc - f.phiThu, 0))}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleStartEditFee(f)}
                            className="px-2.5 py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-surface-muted text-text-secondary text-xs font-medium inline-flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-text-muted" />
                            Cập nhật phí
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-text-muted">
                        Chưa có cấu hình biểu phí cọc giữ chân nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card.Content>
          </Card>
        ))}

      {activeTab === 'ROOM_TYPES' &&
        (isErrorRoomTypes ? (
          <AdminErrorState
            title="Không thể tải danh mục loại phòng"
            message={errorRoomTypes instanceof Error ? errorRoomTypes.message : undefined}
            onRetry={() => void refetchRoomTypes()}
          />
        ) : (
          <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
            <Card.Content className="p-0 overflow-x-auto">
              <table aria-label="Danh mục và biểu phí" className="w-full text-left text-xs">
                <thead className="bg-tone-slate-soft border-b border-border text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-4">Mã loại phòng</th>
                    <th scope="col" className="py-3 px-4">Tên loại phòng trọ</th>
                    <th scope="col" className="py-3 px-4">Mô tả chi tiết</th>
                    <th scope="col" className="py-3 px-4 text-right">Chỉnh sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {isLoadingRoomTypes ? (
                    <AdminTableSkeleton rows={5} cols={4} />
                  ) : normalizedRoomTypes.length > 0 ? (
                    normalizedRoomTypes.map((rt) => (
                      <tr key={rt.code} className="hover:bg-tone-teal-soft/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="inline-block font-mono text-[11px] font-medium text-text-secondary bg-surface-muted px-2 py-0.5 rounded-md">
                            {rt.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-text">{rt.ten}</td>
                        <td className="py-3 px-4 text-text-secondary">{rt.moTa || '--'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingRoomType({ code: rt.code, ten: rt.ten, moTa: rt.moTa })
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-surface-muted text-text-secondary text-xs font-medium inline-flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-text-muted" />
                            Sửa tên / mô tả
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-text-muted">
                        Chưa có danh mục loại phòng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card.Content>
          </Card>
        ))}

      {activeTab === 'AMENITIES' &&
        (isErrorAmenities ? (
          <AdminErrorState
            title="Không thể tải danh mục tiện ích"
            message={errorAmenities instanceof Error ? errorAmenities.message : undefined}
            onRetry={() => void refetchAmenities()}
          />
        ) : (
          <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0">
            <Card.Content className="p-0 overflow-x-auto">
              <table aria-label="Danh mục và biểu phí" className="w-full text-left text-xs">
                <thead className="bg-tone-slate-soft border-b border-border text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3 px-4">Mã tiện ích</th>
                    <th scope="col" className="py-3 px-4">Tên tiện ích</th>
                    <th scope="col" className="py-3 px-4">Mô tả tiện ích</th>
                    <th scope="col" className="py-3 px-4 text-right">Chỉnh sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {isLoadingAmenities ? (
                    <AdminTableSkeleton rows={6} cols={4} />
                  ) : apiAmenities.length > 0 ? (
                    apiAmenities.map((am, idx) => {
                      const displayCode = am.maTienIch || `TI${String(idx + 1).padStart(4, '0')}`;
                      return (
                        <tr key={displayCode} className="hover:bg-tone-teal-soft/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="inline-block font-mono text-[11px] font-medium text-text-secondary bg-surface-muted px-2 py-0.5 rounded-md">
                              {displayCode}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-text">{am.tenTienIch}</td>
                          <td className="py-3 px-4 text-text-secondary">{am.moTa || '--'}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAmenity({ ...am, maTienIch: displayCode });
                                setAmenityName(am.tenTienIch);
                                setAmenityDesc(am.moTa || '');
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-surface-muted text-text-secondary text-xs font-medium inline-flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-text-muted" />
                              Sửa tiện ích
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-text-muted">
                        Chưa có danh mục tiện ích nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card.Content>
          </Card>
        ))}

      {/* MODAL CẬP NHẬT BIỂU PHÍ CỌC & HOA HỒNG */}
      <Modal
        isOpen={!!editingFeeItem}
        onClose={() => setEditingFeeItem(null)}
        title={
          editingFeeItem
            ? `Cập nhật biểu phí: ${editingFeeItem.tenLoaiPhong}`
            : 'Cập nhật biểu phí'
        }
        subtitle={editingFeeItem ? `Mã loại phòng: ${editingFeeItem.maLoaiPhong}` : undefined}
        maxWidth="sm"
      >
        {editingFeeItem && (
          <form onSubmit={handleSaveFee} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Mức tiền cọc giữ chân xem phòng (VNĐ)
              </label>
              <input
                type="number"
                step={10000}
                min={10000}
                value={editCoc}
                onChange={(e) => {
                  setEditCoc(Number(e.target.value));
                  setFeeError('');
                }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-accent font-semibold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Mức phí hoa hồng trích thu sàn (nhỏ hơn tiền cọc)
              </label>
              <input
                type="number"
                step={5000}
                min={0}
                value={editPhi}
                onChange={(e) => {
                  setEditPhi(Number(e.target.value));
                  setFeeError('');
                }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs focus:outline-none focus:border-accent font-semibold text-accent tabular-nums"
              />
            </div>

            {feeError && (
              <p className="text-[11px] font-medium text-danger-text bg-danger-bg border border-danger-border rounded-lg p-2.5">
                {feeError}
              </p>
            )}

            <div className="p-2.5 rounded-lg bg-surface-subtle border border-border text-[11px] text-text-secondary flex justify-between">
              <span>Chủ trọ thực nhận khi thuê thành công:</span>
              <strong className="font-semibold text-success-text tabular-nums">
                {formatVND(Math.max(editCoc - editPhi, 0))}
              </strong>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingFeeItem(null)}
                className="w-1/2 py-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-xs font-medium text-text-secondary cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={updateDepositFeeMutation.isPending}
                className="w-1/2 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {updateDepositFeeMutation.isPending && <Spinner size="sm" color="current" />}
                Lưu cấu hình
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL CHỈNH SỬA LOẠI PHÒNG TRỌ */}
      <Modal
        isOpen={!!editingRoomType}
        onClose={() => setEditingRoomType(null)}
        title="Chỉnh sửa Loại phòng trọ"
        subtitle={editingRoomType ? `Mã loại phòng: ${editingRoomType.code}` : undefined}
        maxWidth="sm"
      >
        {editingRoomType && (
          <form onSubmit={handleSaveRoomType} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Tên loại phòng trọ
              </label>
              <input
                type="text"
                value={editingRoomType.ten}
                onChange={(e) =>
                  setEditingRoomType((prev) => (prev ? { ...prev, ten: e.target.value } : null))
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Mô tả</label>
              <textarea
                rows={3}
                value={editingRoomType.moTa}
                onChange={(e) =>
                  setEditingRoomType((prev) => (prev ? { ...prev, moTa: e.target.value } : null))
                }
                className="w-full p-2.5 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRoomType(null)}
                className="w-1/2 py-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-xs font-medium text-text-secondary cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={updateRoomTypeMutation.isPending}
                className="w-1/2 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {updateRoomTypeMutation.isPending && <Spinner size="sm" color="current" />}
                Lưu thay đổi
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL CHỈNH SỬA TIỆN ÍCH */}
      <Modal
        isOpen={!!editingAmenity}
        onClose={() => setEditingAmenity(null)}
        title="Chỉnh sửa Tiện ích phòng"
        subtitle={editingAmenity ? `Mã tiện ích: ${editingAmenity.maTienIch}` : undefined}
        maxWidth="sm"
      >
        {editingAmenity && (
          <form onSubmit={handleSaveAmenity} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Tên tiện ích
              </label>
              <input
                type="text"
                value={amenityName}
                onChange={(e) => setAmenityName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Mô tả</label>
              <textarea
                rows={3}
                value={amenityDesc}
                onChange={(e) => setAmenityDesc(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingAmenity(null)}
                className="w-1/2 py-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-xs font-medium text-text-secondary cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={updateAmenityMutation.isPending}
                className="w-1/2 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {updateAmenityMutation.isPending && <Spinner size="sm" color="current" />}
                Lưu tiện ích
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
