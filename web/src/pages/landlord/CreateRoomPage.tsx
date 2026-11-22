import React, { useRef, useState } from 'react';
import { Card, Chip } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDollarSign,
  FileText,
  Image as ImageIcon,
  Info,
  Link2,
  Loader2,
  MapPin,
  Sparkles,
  Star,
  UploadCloud,
  X,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MapPicker } from '@/components/map/MapPicker';
import { landlordService } from '@/services/landlord.service';
import type {
  AmenityItem,
  CategoryItem,
  LandlordRoomItem,
  RoomCreatePayload,
} from '@/types/landlord.types';
import { formatVND } from '@/utils/formatters';

interface CreateRoomPageProps {
  isEdit?: boolean;
}

const WIZARD_STEPS = [
  { step: 1, title: 'Thông tin cơ bản', subtitle: 'Loại phòng, diện tích & mô tả', icon: FileText },
  { step: 2, title: 'Vị trí & Bản đồ', subtitle: 'Địa chỉ & vị trí bản đồ', icon: MapPin },
  { step: 3, title: 'Tiện ích đi kèm', subtitle: 'Chọn mã tiện ích thực tế', icon: Sparkles },
  { step: 4, title: 'Hình ảnh thực tế', subtitle: 'Tải lên ảnh phòng trọ', icon: ImageIcon },
  {
    step: 5,
    title: 'Giá thuê & Tiền cọc hợp đồng',
    subtitle: 'Giá thuê, cọc HĐ & đối soát sàn',
    icon: CircleDollarSign,
  },
] as const;

interface CreateRoomWizardFormProps {
  isEdit: boolean;
  id?: string;
  categories: CategoryItem[];
  amenities: AmenityItem[];
  existingRoom?: LandlordRoomItem;
}

const CreateRoomWizardForm: React.FC<CreateRoomWizardFormProps> = ({
  isEdit,
  id,
  categories,
  amenities,
  existingRoom,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Basic Info
  const [selectedCategoryId, setCategoryId] = useState<string>(
    () => existingRoom?.maLpt || categories[0]?.maLpt || 'LPT001',
  );
  const categoryId =
    categories.length > 0 && !categories.some((c) => c.maLpt === selectedCategoryId)
      ? categories[0].maLpt
      : selectedCategoryId;

  const [area, setArea] = useState<string>(() => String(existingRoom?.dienTich || 25));
  const [maxPeople, setMaxPeople] = useState<string>(() => String(existingRoom?.soNguoi || 2));
  const [description, setDescription] = useState<string>(() => existingRoom?.moTa || '');

  // Step 2: Location & Map
  const [address, setAddress] = useState<string>(() => existingRoom?.diaChi || '');
  const [lat, setLat] = useState<number>(() =>
    existingRoom?.viDo ? Number(existingRoom.viDo) : 10.8012,
  );
  const [lng, setLng] = useState<number>(() =>
    existingRoom?.kinhDo ? Number(existingRoom.kinhDo) : 106.7145,
  );

  // Step 3: Amenities (maTienIch codes: TI0001...)
  const [selectedAmenityCodes, setSelectedAmenityCodes] = useState<string[]>(() => {
    if (existingRoom?.dsMaTienIch && existingRoom.dsMaTienIch.length > 0) {
      return existingRoom.dsMaTienIch;
    }
    if (existingRoom?.dsTienIch && existingRoom.dsTienIch.length > 0 && amenities.length > 0) {
      const mapped = amenities
        .filter((a) => existingRoom.dsTienIch?.includes(a.tenTienIch))
        .map((a) => a.maTienIch);
      if (mapped.length > 0) return mapped;
    }
    return ['TI0001', 'TI0004'];
  });

  // Step 4: Images
  const [imageUrls, setImageUrls] = useState<string[]>(() => {
    if (existingRoom?.danhSachAnh && existingRoom.danhSachAnh.length > 0) {
      return existingRoom.danhSachAnh;
    }
    if (existingRoom?.hinhAnhUrl) {
      return [existingRoom.hinhAnhUrl];
    }
    return [];
  });
  const [manualImageUrl, setManualImageUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Step 5: Price & Contract Deposit
  const [price, setPrice] = useState<string>(() => String(existingRoom?.giaThue || ''));
  const [contractDeposit, setContractDeposit] = useState<string>(() =>
    String(existingRoom?.cocPhong ?? existingRoom?.giaThue ?? ''),
  );

  const uploadImagesMutation = useMutation({
    mutationFn: (files: File[]) => landlordService.uploadImages(files),
    onSuccess: (urls) => {
      if (urls.length > 0) {
        setImageUrls((prev) => [...prev, ...urls]);
        toast.success(`Đã tải lên thành công ${urls.length} hình ảnh`);
      }
    },
    onError: (err) => {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể tải ảnh lên máy chủ. Bạn có thể dán link ảnh trực tiếp bên dưới.';
      toast.error(msg);
    },
  });

  const saveRoomMutation = useMutation({
    mutationFn: (payload: RoomCreatePayload) =>
      isEdit && id
        ? landlordService.updateRoom(id, payload)
        : landlordService.createRoom(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord', 'rooms'] });
      void queryClient.invalidateQueries({ queryKey: ['landlord', 'dashboard-stats'] });
      toast.success(
        isEdit
          ? 'Cập nhật thông tin phòng trọ thành công!'
          : 'Gửi duyệt bài đăng phòng mới thành công! Phòng sẽ hiển thị công khai sau khi Admin duyệt.',
      );
      navigate('/landlord/rooms');
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi lưu bài đăng phòng trọ';
      toast.error(msg);
    },
  });

  const formatCurrencyInput = (val: string) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('vi-VN');
  };

  const handleToggleAmenity = (maTienIch: string) => {
    setSelectedAmenityCodes((prev) =>
      prev.includes(maTienIch)
        ? prev.filter((code) => code !== maTienIch)
        : [...prev, maTienIch],
    );
  };

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const validFiles = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (validFiles.length === 0) {
      toast.error('Vui lòng chọn định dạng tệp hình ảnh (JPG, PNG, WEBP)');
      return;
    }
    uploadImagesMutation.mutate(validFiles);
  };

  const handleAddManualUrl = () => {
    const trimmed = manualImageUrl.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        toast.error('Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://');
        return;
      }
      setImageUrls((prev) => [...prev, trimmed]);
      setManualImageUrl('');
    } catch {
      toast.error('Đường dẫn URL hình ảnh không hợp lệ');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverImage = (index: number) => {
    if (index === 0) return;
    setImageUrls((prev) => {
      const copy = [...prev];
      const [target] = copy.splice(index, 1);
      return [target, ...copy];
    });
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!categoryId) {
        toast.error('Vui lòng chọn loại hình phòng trọ');
        return false;
      }
      const numArea = Number(area);
      if (!numArea || numArea <= 0) {
        toast.error('Vui lòng nhập diện tích phòng lớn hơn 0 m²');
        return false;
      }
      const numPeople = Number(maxPeople);
      if (!numPeople || numPeople < 1) {
        toast.error('Số người ở tối đa phải từ 1 người trở lên');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!address.trim() || address.trim().length < 5) {
        toast.error('Vui lòng nhập địa chỉ cụ thể của phòng trọ');
        return false;
      }
      if (isNaN(lat) || isNaN(lng)) {
        toast.error('Tọa độ bản đồ không hợp lệ');
        return false;
      }
      return true;
    }
    if (step === 3) {
      return true;
    }
    if (step === 4) {
      if (imageUrls.length === 0) {
        toast.error('Vui lòng tải lên hoặc thêm tối thiểu 1 hình ảnh đại diện thực tế của phòng');
        return false;
      }
      return true;
    }
    if (step === 5) {
      const numPrice = Number(price.replace(/\D/g, ''));
      if (!numPrice || numPrice <= 0) {
        toast.error('Vui lòng nhập giá thuê hàng tháng hợp lệ');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(5, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      return;
    }
    for (let s = currentStep; s < targetStep; s += 1) {
      if (!validateStep(s)) return;
    }
    setCurrentStep(targetStep);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (let s = 1; s <= 5; s += 1) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    const numPrice = Number(price.replace(/\D/g, ''));
    const rawDeposit = contractDeposit.replace(/\D/g, '');
    const numDeposit = rawDeposit !== '' ? Number(rawDeposit) : numPrice;

    const payload: RoomCreatePayload = {
      diaChi: address.trim(),
      giaThue: numPrice,
      dienTich: Math.round(Number(area)),
      soNguoi: Math.round(Number(maxPeople)),
      maLpt: categoryId,
      moTa: description.trim() || undefined,
      kinhDo: String(lng),
      viDo: String(lat),
      coc: numDeposit,
      dsMaTienIch: selectedAmenityCodes,
      hinhAnhUrls: imageUrls,
    };

    saveRoomMutation.mutate(payload);
  };

  const selectedCategory = categories.find((c) => c.maLpt === categoryId);
  const viewingDeposit = selectedCategory?.soTienCoc ?? 200_000;
  const platformFee = selectedCategory?.phiThu ?? 20_000;
  const landlordNetAdvance = Math.max(0, viewingDeposit - platformFee);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <Card.Header className="p-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/landlord/rooms')}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <Card.Title className="text-lg font-bold text-slate-900">
                {isEdit ? `Chỉnh Sửa Phòng Trọ #${id}` : 'Đăng Tin Phòng Trọ Mới'}
              </Card.Title>
              <Card.Description className="text-xs text-slate-500">
                Quy trình 5 bước chuẩn hóa kiểm duyệt bài đăng InnFinder
              </Card.Description>
            </div>
          </div>

          <Chip size="sm" color="accent" variant="soft">
            <Chip.Label>Bước {currentStep} / 5</Chip.Label>
          </Chip>
        </Card.Header>
      </Card>

      {/* 5-Step Stepper Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
        {WIZARD_STEPS.map((item) => {
          const Icon = item.icon;
          const isActive = currentStep === item.step;
          const isCompleted = currentStep > item.step;
          return (
            <button
              type="button"
              key={item.step}
              onClick={() => handleStepClick(item.step)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                isActive
                  ? 'bg-cyan-600 border-cyan-600 text-white shadow-md shadow-cyan-600/15'
                  : isCompleted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
                    : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <span
                  className={`block text-[10px] font-bold uppercase tracking-wider ${
                    isActive
                      ? 'text-cyan-100'
                      : isCompleted
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                  }`}
                >
                  Bước {item.step}
                </span>
                <span className="block text-xs font-bold truncate">{item.title}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Step 1: Thông tin cơ bản */}
      {currentStep === 1 && (
        <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <Card.Header className="p-0">
            <Card.Title className="text-base font-bold text-slate-900">
              Bước 1: Thông tin cơ bản của phòng trọ
            </Card.Title>
            <Card.Description className="text-xs text-slate-500">
              Chọn danh mục loại phòng (quy định mức cọc lịch xem tương ứng), diện tích, sức chứa và nội quy phòng
            </Card.Description>
          </Card.Header>

          <Card.Content className="p-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Loại hình phòng trọ <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 bg-white font-semibold"
                >
                  {categories.map((c) => (
                    <option key={c.maLpt} value={c.maLpt}>
                      {c.tenLoaiPhongTro} ({c.maLpt})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Diện tích sử dụng (m²) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={5}
                  max={500}
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="VD: 25"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số người ở tối đa <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxPeople}
                  onChange={(e) => setMaxPeople(e.target.value)}
                  placeholder="VD: 2"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 font-bold"
                />
              </div>
            </div>

            {selectedCategory && (
              <div className="p-3.5 rounded-xl bg-cyan-50/60 border border-cyan-100 flex flex-wrap items-center justify-between gap-2 text-xs text-cyan-900">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>
                    Loại phòng <strong>{selectedCategory.tenLoaiPhongTro}</strong> áp dụng mức cọc giữ chân lịch xem:{' '}
                    <strong>{formatVND(viewingDeposit)}</strong> (Phí hoa hồng sàn khi chốt thuê thành công:{' '}
                    <strong>{formatVND(platformFee)}</strong>)
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mô tả chi tiết & Nội quy phòng trọ
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết tình trạng nội thất, giờ giấc ra vào, giá điện nước, chỗ để xe và nội quy chung..."
                className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 leading-relaxed"
              />
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Step 2: Vị trí & Bản đồ */}
      {currentStep === 2 && (
        <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <Card.Header className="p-0">
            <Card.Title className="text-base font-bold text-slate-900">
              Bước 2: Vị trí địa chỉ & Tọa độ bản đồ
            </Card.Title>
            <Card.Description className="text-xs text-slate-500">
              Nhập địa chỉ chính xác và kéo thả ghim trên bản đồ để khách hàng dễ dàng tìm kiếm theo khu vực
            </Card.Description>
          </Card.Header>

          <Card.Content className="p-0 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Địa chỉ cụ thể <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, ngõ/hẻm, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vĩ độ (Latitude)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kinh độ (Longitude)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-700"
                />
              </div>
            </div>

            <MapPicker
              lat={lat}
              lng={lng}
              onChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
              height="340px"
            />
          </Card.Content>
        </Card>
      )}

      {/* Step 3: Tiện ích đi kèm */}
      {currentStep === 3 && (
        <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <div>
              <Card.Title className="text-base font-bold text-slate-900">
                Bước 3: Tiện ích đi kèm theo phòng
              </Card.Title>
              <Card.Description className="text-xs text-slate-500">
                Chọn các tiện ích thực tế đang trang bị tại phòng trọ (lưu theo mã chuẩn TI0001...)
              </Card.Description>
            </div>
            <Chip size="sm" color="success" variant="soft">
              <Chip.Label>Đã chọn {selectedAmenityCodes.length} tiện ích</Chip.Label>
            </Chip>
          </Card.Header>

          <Card.Content className="p-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {amenities.map((amenity) => {
                const isChecked = selectedAmenityCodes.includes(amenity.maTienIch);
                return (
                  <button
                    type="button"
                    key={amenity.maTienIch}
                    onClick={() => handleToggleAmenity(amenity.maTienIch)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      isChecked
                        ? 'border-cyan-500 bg-cyan-50/60 text-cyan-900 ring-1 ring-cyan-500/40'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block truncate">{amenity.tenTienIch}</span>
                      <span className="block text-[10px] font-mono text-slate-400">
                        {amenity.maTienIch}
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-cyan-600 text-white' : 'border border-slate-300'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Step 4: Hình ảnh thực tế */}
      {currentStep === 4 && (
        <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <div>
              <Card.Title className="text-base font-bold text-slate-900">
                Bước 4: Hình ảnh thực tế của phòng trọ
              </Card.Title>
              <Card.Description className="text-xs text-slate-500">
                Bắt buộc tối thiểu 1 ảnh đại diện rõ nét. Ảnh đầu tiên sẽ được chọn làm ảnh bìa hiển thị.
              </Card.Description>
            </div>
            <Chip size="sm" color="accent" variant="soft">
              <Chip.Label>{imageUrls.length} hình ảnh</Chip.Label>
            </Chip>
          </Card.Header>

          <Card.Content className="p-0 space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={(e) => processFiles(e.target.files)}
              className="hidden"
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                processFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-cyan-500 bg-cyan-50/50 ring-2 ring-cyan-500/20'
                  : 'border-slate-300 hover:border-cyan-500 hover:bg-slate-50/60'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-2">
                {uploadImagesMutation.isPending ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-bold text-slate-800">
                {uploadImagesMutation.isPending
                  ? 'Đang tải ảnh lên...'
                  : 'Kéo thả hình ảnh vào đây hoặc bấm để chọn tệp từ máy tính'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Hỗ trợ PNG, JPG, JPEG, WEBP (tối đa 10MB/ảnh)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={manualImageUrl}
                  onChange={(e) => setManualImageUrl(e.target.value)}
                  placeholder="Hoặc dán trực tiếp URL hình ảnh (https://...)"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800"
                />
              </div>
              <button
                type="button"
                onClick={handleAddManualUrl}
                className="px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Thêm URL
              </button>
            </div>

            {imageUrls.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {imageUrls.map((img, idx) => (
                  <div
                    key={`${img}-${idx}`}
                    className="relative aspect-4/3 rounded-xl overflow-hidden ring-1 ring-slate-200 group bg-slate-100"
                  >
                    <img src={img} alt={`Ảnh phòng ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 ? (
                      <span className="absolute top-2 left-2 bg-cyan-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" />
                        Ảnh đại diện
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCoverImage(idx)}
                        className="absolute top-2 left-2 bg-slate-900/70 hover:bg-cyan-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        Đặt làm bìa
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer"
                      title="Xóa ảnh này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-300" />
                <span>Chưa có hình ảnh nào. Vui lòng tải lên ít nhất 1 ảnh thực tế.</span>
              </div>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Step 5: Giá thuê & Tiền cọc hợp đồng */}
      {currentStep === 5 && (
        <Card className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <Card.Header className="p-0">
            <Card.Title className="text-base font-bold text-slate-900">
              Bước 5: Thiết lập Giá thuê & Tiền cọc hợp đồng
            </Card.Title>
            <Card.Description className="text-xs text-slate-500">
              Phân tách minh bạch giữa thỏa thuận thuê phòng ngoài đời thực và cọc giữ chân lịch xem trên sàn InnFinder
            </Card.Description>
          </Card.Header>

          <Card.Content className="p-0 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Giá thuê hàng tháng (VNĐ) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatCurrencyInput(price)}
                    onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                    placeholder="VD: 3.500.000"
                    className="w-full text-sm p-3.5 pr-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-900 font-extrabold"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₫
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Khách thuê thanh toán trực tiếp cho Chủ trọ (Sàn không thu hộ giá thuê).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tiền cọc hợp đồng phòng (VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatCurrencyInput(contractDeposit)}
                    onChange={(e) => setContractDeposit(e.target.value.replace(/\D/g, ''))}
                    placeholder="Mặc định bằng 1 tháng tiền thuê"
                    className="w-full text-sm p-3.5 pr-12 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-900 font-extrabold"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₫
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Tiền cọc ký hợp đồng thuê trực tiếp giữa hai bên ngoài đời thực.
                </span>
              </div>
            </div>

            {/* Platform Viewing Deposit & Fee Info Box */}
            <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-cyan-950 uppercase tracking-wider">
                  Cơ chế Cọc giữ chân lịch xem & Phí hoa hồng Sàn ({selectedCategory?.tenLoaiPhongTro || categoryId})
                </h4>
                <Chip size="sm" color="accent" variant="soft">
                  <Chip.Label>Quy chuẩn Swimlane 2.3</Chip.Label>
                </Chip>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-cyan-100">
                  <span className="text-[11px] text-slate-500 block">
                    Cọc giữ chân lịch xem (soTienCoc)
                  </span>
                  <span className="text-base font-black text-cyan-700 mt-0.5 block">
                    {formatVND(viewingDeposit)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Khách nộp cho Sàn khi đặt lịch hẹn
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-cyan-100">
                  <span className="text-[11px] text-slate-500 block">
                    Phí hoa hồng môi giới (phiThu)
                  </span>
                  <span className="text-base font-black text-amber-700 mt-0.5 block">
                    {formatVND(platformFee)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Chỉ trích thu khi cả 2 bên đồng ý thuê
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-cyan-100">
                  <span className="text-[11px] text-slate-500 block">
                    Hoàn về Ví Chủ trọ khi chốt thuê
                  </span>
                  <span className="text-base font-black text-emerald-700 mt-0.5 block">
                    {formatVND(landlordNetAdvance)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Hoàn 100% ({formatVND(viewingDeposit)}) nếu không thuê
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Review */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <span className="font-bold text-slate-800 block">Tóm tắt bài đăng trước khi gửi duyệt:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-slate-600">
                <div>
                  Loại phòng: <strong className="text-slate-800">{selectedCategory?.tenLoaiPhongTro}</strong>
                </div>
                <div>
                  Diện tích & Sức chứa: <strong className="text-slate-800">{area} m² · Tối đa {maxPeople} người</strong>
                </div>
                <div className="sm:col-span-2">
                  Địa chỉ: <strong className="text-slate-800">{address || 'Chưa nhập'}</strong> ({lat}, {lng})
                </div>
                <div>
                  Tiện ích đã chọn: <strong className="text-slate-800">{selectedAmenityCodes.length} tiện ích</strong>
                </div>
                <div>
                  Hình ảnh thực tế: <strong className="text-slate-800">{imageUrls.length} ảnh</strong>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Wizard Navigation Footer */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          type="button"
          onClick={currentStep === 1 ? () => navigate('/landlord/rooms') : handlePrevStep}
          className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentStep === 1 ? 'Hủy & Quay lại' : 'Quay lại bước trước'}</span>
        </button>

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Tiếp tục Bước {currentStep + 1}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={saveRoomMutation.isPending || uploadImagesMutation.isPending}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saveRoomMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>
              {saveRoomMutation.isPending
                ? 'Đang gửi...'
                : isEdit
                  ? 'Lưu cập nhật phòng'
                  : 'Gửi duyệt bài đăng'}
            </span>
          </button>
        )}
      </div>
    </form>
  );
};

export const CreateRoomPage: React.FC<CreateRoomPageProps> = ({ isEdit = false }) => {
  const { id } = useParams<{ id: string }>();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'room-types'],
    queryFn: landlordService.getCategories,
  });

  const { data: amenities = [] } = useQuery({
    queryKey: ['categories', 'amenities'],
    queryFn: landlordService.getAmenities,
  });

  const { data: existingRoom, isLoading: fetchingRoom } = useQuery({
    queryKey: ['landlord', 'room-detail', id],
    queryFn: () => landlordService.getRoomById(id!),
    enabled: isEdit && Boolean(id),
  });

  if (fetchingRoom) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-7 h-7 animate-spin text-cyan-600 mb-2" />
        <span className="text-xs font-medium">Đang tải thông tin phòng trọ...</span>
      </div>
    );
  }

  return (
    <CreateRoomWizardForm
      key={`${existingRoom?.maPhongTro ?? 'create'}-${amenities.length}`}
      isEdit={isEdit}
      id={id}
      categories={categories}
      amenities={amenities}
      existingRoom={existingRoom}
    />
  );
};
