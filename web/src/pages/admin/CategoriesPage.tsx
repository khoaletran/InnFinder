import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Chip, Spinner } from '@heroui/react';
import { Coins, Edit3, Layers, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { roomService } from '@/services/room.service';
import { Modal } from '@/components/common/Modal';
import { formatVND } from '@/utils/formatters';
import { categoryDepositFeeSchema, REGEX_PATTERNS } from '@/utils/validators';
import type { RoomTypeDepositFee } from '@/types/admin.types';
import type { AmenityResponse, CategoryResponse } from '@/types/room.types';

// Mã chuẩn bắt buộc khớp ^LPT\d{3}$ và ^TI\d{4}$ theo AGENTS.md §3.5 & §3.10
const FALLBACK_DEPOSIT_FEES: RoomTypeDepositFee[] = [
  {
    maLoaiPhong: 'LPT001',
    tenLoaiPhong: 'Phòng trọ truyền thống',
    soTienCoc: 200000,
    phiThu: 20000,
    moTa: 'Phòng đơn hoặc dãy trọ sinh viên, công nhân',
  },
  {
    maLoaiPhong: 'LPT002',
    tenLoaiPhong: 'Chung cư mini',
    soTienCoc: 300000,
    phiThu: 30000,
    moTa: 'Căn hộ khép kín, có thang máy, bảo vệ 24/7',
  },
  {
    maLoaiPhong: 'LPT003',
    tenLoaiPhong: 'Căn hộ dịch vụ',
    soTienCoc: 500000,
    phiThu: 50000,
    moTa: 'Full nội thất cao cấp, dịch vụ dọn phòng định kỳ',
  },
  {
    maLoaiPhong: 'LPT004',
    tenLoaiPhong: 'Nhà nguyên căn',
    soTienCoc: 500000,
    phiThu: 50000,
    moTa: 'Nhà riêng nhiều tầng, phù hợp nhóm bạn hoặc gia đình',
  },
  {
    maLoaiPhong: 'LPT005',
    tenLoaiPhong: 'Ở ghép / Ký túc xá Sleepbox',
    soTienCoc: 100000,
    phiThu: 10000,
    moTa: 'Giường tầng hoặc box riêng tư tối ưu chi phí',
  },
];

const FALLBACK_AMENITIES: AmenityResponse[] = [
  { maTienIch: 'TI0001', tenTienIch: 'Điều hòa nhiệt độ', moTa: 'Máy lạnh tiết kiệm điện Inverter' },
  { maTienIch: 'TI0002', tenTienIch: 'Bình nóng lạnh', moTa: 'Nước nóng năng lượng mặt trời hoặc bình điện' },
  { maTienIch: 'TI0003', tenTienIch: 'Máy giặt', moTa: 'Máy giặt riêng hoặc khu giặt sấy chung' },
  { maTienIch: 'TI0004', tenTienIch: 'Tủ lạnh', moTa: 'Tủ lạnh trang bị sẵn trong phòng' },
  { maTienIch: 'TI0005', tenTienIch: 'Wifi tốc độ cao', moTa: 'Internet cáp quang phủ sóng từng tầng' },
  { maTienIch: 'TI0006', tenTienIch: 'Khóa vân tay 24/7', moTa: 'Ra vào tự do bằng vân tay an ninh' },
];

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

  const { data: apiDepositFees = [], isLoading: isLoadingFees } = useQuery({
    queryKey: ['admin', 'deposit-fees'],
    queryFn: () => adminService.getRoomTypeDepositFees(),
  });

  const { data: apiRoomTypes = [], isLoading: isLoadingRoomTypes } = useQuery({
    queryKey: ['categories', 'room-types'],
    queryFn: () => roomService.getRoomTypes(),
  });

  const { data: apiAmenities = [], isLoading: isLoadingAmenities } = useQuery({
    queryKey: ['categories', 'amenities'],
    queryFn: () => roomService.getAmenities(),
  });

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

  const fees: RoomTypeDepositFee[] =
    apiDepositFees.length > 0 ? apiDepositFees : FALLBACK_DEPOSIT_FEES;

  const normalizedRoomTypes: Array<{ code: string; ten: string; moTa: string }> =
    apiRoomTypes.length > 0
      ? apiRoomTypes.map((rt: CategoryResponse, idx: number) => {
          const rawCode = rt.maLpt || rt.maLoaiPhong || '';
          const fallbackCode = `LPT${String(idx + 1).padStart(3, '0')}`;
          return {
            code: REGEX_PATTERNS.ROOM_TYPE_CODE.test(rawCode) ? rawCode : rawCode || fallbackCode,
            ten: rt.tenLoaiPhongTro || rt.tenLoaiPhong || `Loại phòng ${idx + 1}`,
            moTa: rt.moTa || '',
          };
        })
      : FALLBACK_DEPOSIT_FEES.map((f) => ({
          code: f.maLoaiPhong,
          ten: f.tenLoaiPhong,
          moTa: f.moTa || '',
        }));

  const amenities: AmenityResponse[] =
    apiAmenities.length > 0 ? apiAmenities : FALLBACK_AMENITIES;

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

  return (
    <div className="space-y-6">
      {/* Title & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý Danh mục & Biểu phí Sàn
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình Cọc giữ chân (`Coc`), Phí hoa hồng (`PhiThu`), Loại phòng (`^LPT\d{3}$`) và Tiện ích (`^TI\d{4}$`)
          </p>
        </div>

        <div className="flex flex-wrap rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('DEPOSIT_FEES')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'DEPOSIT_FEES'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Biểu phí Cọc & Hoa hồng
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ROOM_TYPES')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'ROOM_TYPES'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Loại phòng ({normalizedRoomTypes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('AMENITIES')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'AMENITIES'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Tiện ích ({amenities.length})
          </button>
        </div>
      </div>

      {/* Policy Info Card */}
      <Card className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-none">
        <Card.Content className="p-0 text-xs text-blue-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-blue-950">
            <Coins className="w-4 h-4 text-blue-600" />
            Quy chế tài chính cốt lõi (Bất khả xâm phạm theo AGENTS.md):
          </div>
          <p className="leading-relaxed">
            1. <strong>Tiền cọc giữ chân xem phòng (`soTienCoc &gt; 0`)</strong>: Khách nộp cho sàn tạm giữ khi đặt lịch hẹn. Khi gặp thực tế, Chủ trọ ứng tiền mặt/CK trả 100% cho khách.
          </p>
          <p className="leading-relaxed">
            2. <strong>Hoa hồng sàn (`0 &lt;= phiThu &lt; soTienCoc`)</strong>: Sàn chỉ thu khi cả hai bên cùng xác nhận thuê thành công (`HOAN_THANH`). Phần còn lại (`soTienCoc - phiThu`) cộng vào ví Chủ trọ.
          </p>
        </Card.Content>
      </Card>

      {activeTab === 'DEPOSIT_FEES' && (
        <Card className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-0">
          <Card.Content className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Mã & Loại phòng trọ</th>
                  <th className="py-3 px-4">Mô tả đặc trưng</th>
                  <th className="py-3 px-4">Cọc giữ chân (`soTienCoc`)</th>
                  <th className="py-3 px-4">Hoa hồng sàn (`phiThu`)</th>
                  <th className="py-3 px-4">Chủ trọ thực nhận</th>
                  <th className="py-3 px-4 text-right">Điều chỉnh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingFees ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Spinner size="md" className="mx-auto mb-2" />
                      <div className="mt-2">Đang tải biểu phí cọc giữ chân...</div>
                    </td>
                  </tr>
                ) : (
                  fees.map((f) => (
                    <tr key={f.maLoaiPhong} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{f.tenLoaiPhong}</span>
                        <Chip size="sm" variant="soft" color="accent" className="font-mono mt-1">
                          {f.maLoaiPhong}
                        </Chip>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{f.moTa || '--'}</td>
                      <td className="py-3 px-4 font-black text-slate-900 text-sm">
                        {formatVND(f.soTienCoc)}
                      </td>
                      <td className="py-3 px-4 font-black text-blue-600 text-sm">
                        {formatVND(f.phiThu)}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">
                        {formatVND(Math.max(f.soTienCoc - f.phiThu, 0))}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleStartEditFee(f)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          Cập nhật phí
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      )}

      {activeTab === 'ROOM_TYPES' && (
        <Card className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-0">
          <Card.Content className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Mã loại phòng (`^LPT\d{3}$`)</th>
                  <th className="py-3 px-4">Tên loại phòng trọ</th>
                  <th className="py-3 px-4">Mô tả chi tiết</th>
                  <th className="py-3 px-4 text-right">Chỉnh sửa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingRoomTypes ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <Spinner size="md" className="mx-auto mb-2" />
                      <div className="mt-2">Đang tải danh mục loại phòng...</div>
                    </td>
                  </tr>
                ) : (
                  normalizedRoomTypes.map((rt) => (
                    <tr key={rt.code} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <Chip size="sm" variant="soft" color="accent" className="font-mono font-bold">
                          {rt.code}
                        </Chip>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{rt.ten}</td>
                      <td className="py-3 px-4 text-slate-600">{rt.moTa || '--'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingRoomType({ code: rt.code, ten: rt.ten, moTa: rt.moTa })
                          }
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          Sửa tên / mô tả
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      )}

      {activeTab === 'AMENITIES' && (
        <Card className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-0">
          <Card.Content className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Mã tiện ích (`^TI\d{4}$`)</th>
                  <th className="py-3 px-4">Tên tiện ích</th>
                  <th className="py-3 px-4">Mô tả tiện ích</th>
                  <th className="py-3 px-4 text-right">Chỉnh sửa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingAmenities ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <Spinner size="md" className="mx-auto mb-2" />
                      <div className="mt-2">Đang tải danh mục tiện ích...</div>
                    </td>
                  </tr>
                ) : (
                  amenities.map((am, idx) => {
                    const displayCode = REGEX_PATTERNS.AMENITY_CODE.test(am.maTienIch)
                      ? am.maTienIch
                      : am.maTienIch || `TI${String(idx + 1).padStart(4, '0')}`;
                    return (
                      <tr key={displayCode} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <Chip
                            size="sm"
                            variant="soft"
                            color="success"
                            className="font-mono font-bold"
                          >
                            {displayCode}
                          </Chip>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{am.tenTienIch}</td>
                        <td className="py-3 px-4 text-slate-600">{am.moTa || '--'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAmenity({ ...am, maTienIch: displayCode });
                              setAmenityName(am.tenTienIch);
                              setAmenityDesc(am.moTa || '');
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            Sửa tiện ích
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      )}

      {/* MODAL CẬP NHẬT BIỂU PHÍ CỌC & HOA HỒNG */}
      <Modal
        isOpen={!!editingFeeItem}
        onClose={() => setEditingFeeItem(null)}
        title={
          editingFeeItem
            ? `Cập nhật biểu phí: ${editingFeeItem.tenLoaiPhong}`
            : 'Cập nhật biểu phí'
        }
        subtitle={editingFeeItem ? `Mã cấu hình: ${editingFeeItem.maLoaiPhong}` : undefined}
        maxWidth="sm"
      >
        {editingFeeItem && (
          <form onSubmit={handleSaveFee} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mức tiền cọc giữ chân xem phòng (`soTienCoc` &gt; 0 VNĐ)
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mức phí hoa hồng trích thu sàn (`0 &lt;= phiThu &lt; soTienCoc`)
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold text-blue-600"
              />
            </div>

            {feeError && (
              <p className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">
                {feeError}
              </p>
            )}

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex justify-between">
              <span>Chủ trọ thực nhận khi thuê thành công:</span>
              <strong className="text-emerald-600">
                {formatVND(Math.max(editCoc - editPhi, 0))}
              </strong>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingFeeItem(null)}
                className="w-1/2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={updateDepositFeeMutation.isPending}
                className="w-1/2 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên loại phòng trọ
              </label>
              <input
                type="text"
                value={editingRoomType.ten}
                onChange={(e) =>
                  setEditingRoomType((prev) => (prev ? { ...prev, ten: e.target.value } : null))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả</label>
              <textarea
                rows={3}
                value={editingRoomType.moTa}
                onChange={(e) =>
                  setEditingRoomType((prev) => (prev ? { ...prev, moTa: e.target.value } : null))
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRoomType(null)}
                className="w-1/2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={updateRoomTypeMutation.isPending}
                className="w-1/2 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên tiện ích
              </label>
              <input
                type="text"
                value={amenityName}
                onChange={(e) => setAmenityName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả</label>
              <textarea
                rows={3}
                value={amenityDesc}
                onChange={(e) => setAmenityDesc(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingAmenity(null)}
                className="w-1/2 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={updateAmenityMutation.isPending}
                className="w-1/2 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
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
