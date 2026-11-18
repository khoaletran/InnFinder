import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  UploadCloud,
  X,
  MapPin,
  Check,
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  Star,
} from 'lucide-react';
import { landlordService } from '../../services/landlord.service';
import { MapPicker } from '../../components/landlord/MapPicker';
import type { CategoryItem, AmenityItem } from '../../types/landlord.types';
import { toast } from 'sonner';

interface CreateRoomPageProps {
  isEdit?: boolean;
}

export const CreateRoomPage: React.FC<CreateRoomPageProps> = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [amenities, setAmenities] = useState<AmenityItem[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('LPT01');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [area, setArea] = useState('');
  const [maxPeople, setMaxPeople] = useState('2');
  const [address, setAddress] = useState('123 Đường D2, Phường 25, Quận Bình Thạnh, TP.HCM');
  const [lat, setLat] = useState(10.8012);
  const [lng, setLng] = useState(106.7145);
  const [description, setDescription] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'Máy lạnh',
    'Wifi tốc độ cao',
  ]);

  // Image upload state
  const [images, setImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingRoom, setFetchingRoom] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const [cats, amens] = await Promise.all([
        landlordService.getCategories(),
        landlordService.getAmenities(),
      ]);
      setCategories(cats);
      setAmenities(amens);

      if (isEdit && id) {
        setFetchingRoom(true);
        try {
          const room = await landlordService.getRoomById(id);
          if (room) {
            setTitle(room.tenPhong);
            setCategoryId(room.maLpt || 'LPT01');
            setPrice(String(room.giaThue));
            setDeposit(String(room.cocPhong || room.giaThue));
            setArea(String(room.dienTich));
            setMaxPeople(String(room.soNguoi || 2));
            setAddress(room.diaChi);
            if (room.kinhDo) setLng(Number(room.kinhDo));
            if (room.viDo) setLat(Number(room.viDo));
            setDescription(room.moTa || '');
            if (room.dsTienIch) setSelectedAmenities(room.dsTienIch);
            if (room.danhSachAnh && room.danhSachAnh.length > 0) {
              setImages(room.danhSachAnh);
            } else if (room.hinhAnhUrl) {
              setImages([room.hinhAnhUrl]);
            }
          }
        } finally {
          setFetchingRoom(false);
        }
      }
    };
    initData();
  }, [isEdit, id]);

  const handleToggleAmenity = (name: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  // Helper format currency with dots: 1000000 -> 1.000.000
  const formatCurrency = (val: string) => {
    if (!val) return '';
    const digits = val.replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('vi-VN');
  };

  // Process chosen local image files
  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError('');

    const validFiles: File[] = [];
    Array.from(fileList).forEach((file) => {
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      }
    });

    if (validFiles.length === 0) {
      setUploadError('Vui lòng chọn định dạng hình ảnh (PNG, JPG, JPEG, WEBP)');
      return;
    }

    // Convert to DataURL for immediate preview
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImages((prev) => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverImage = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const target = copy.splice(index, 1)[0];
      return [target, ...copy];
    });
    setSelectedFiles((prev) => {
      if (index >= prev.length) return prev;
      const copy = [...prev];
      const target = copy.splice(index, 1)[0];
      return [target, ...copy];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawPrice = price.replace(/\D/g, '');
    const rawDeposit = deposit.replace(/\D/g, '');

    if (!title.trim()) return toast.error('Vui lòng nhập tiêu đề bài đăng phòng');
    if (!rawPrice || Number(rawPrice) <= 0) return toast.error('Vui lòng nhập giá thuê hợp lệ');
    if (images.length === 0) {
      setUploadError('Vui lòng chọn hoặc kéo thả tối thiểu 1 hình ảnh từ máy tính');
      return toast.error('Vui lòng chọn tối thiểu 1 hình ảnh phòng thực tế từ máy tính');
    }

    setLoading(true);
    try {
      // Upload actual files to backend Cloudinary if available
      let finalImageUrls = [...images];
      if (selectedFiles.length > 0) {
        try {
          const uploaded = await landlordService.uploadImages(selectedFiles);
          if (uploaded && uploaded.length > 0) {
            finalImageUrls = uploaded;
          }
        } catch {
          // Keep current preview urls
        }
      }

      const selectedCat = categories.find((c) => c.maLpt === categoryId);
      const roomPayload = {
        tenPhong: title.trim(),
        giaThue: Number(rawPrice),
        cocPhong: Number(rawDeposit) || Number(rawPrice),
        dienTich: Number(area) || 25,
        soNguoi: Number(maxPeople) || 2,
        diaChi: address.trim(),
        kinhDo: lng,
        viDo: lat,
        moTa: description.trim(),
        maLpt: categoryId,
        loaiPhong: selectedCat?.tenLoaiPhongTro || 'Phòng trọ khép kín',
        dsTienIch: selectedAmenities,
        hinhAnhUrl: finalImageUrls[0],
        danhSachAnh: finalImageUrls,
      };

      if (isEdit && id) {
        await landlordService.updateRoom(id, roomPayload);
        toast.success('Cập nhật thông tin phòng thành công!');
      } else {
        await landlordService.createRoom(roomPayload);
        toast.success('Gửi duyệt bài đăng phòng mới thành công! Bài đăng sẽ hiển thị sau khi Admin phê duyệt.');
      }
      navigate('/landlord/rooms');
    } catch {
      toast.error('Đã xảy ra lỗi khi lưu thông tin phòng.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingRoom) {
    return (
      <div className="py-20 text-center text-slate-400">
        Đang tải thông tin phòng...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/landlord/rooms')}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Chỉnh Sửa Thông Tin Phòng' : 'Đăng Tin Phòng Trọ Mới'}
            </h2>
            <p className="text-xs text-slate-500">
              Điền đầy đủ thông tin để thu hút khách thuê nhanh chóng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/landlord/rooms')}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Đăng phòng ngay'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left (Map + Amenities) & Right (Images + Basic Info) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Map & Address & Amenities */}
        <div className="space-y-6">
          {/* Section: Map Location */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-slate-800">Vị Trí & Tọa Độ Bản Đồ</h3>
              </div>
              <span className="text-[11px] text-cyan-600 font-semibold">
                Click hoặc kéo ghim trên bản đồ
              </span>
            </div>

            {/* Address input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Địa chỉ chi tiết <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, tên đường, phường, quận..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800"
              />
            </div>

            {/* Interactive Leaflet Map */}
            <MapPicker
              lat={lat}
              lng={lng}
              onChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
              height="300px"
            />
          </div>

          {/* Section: Amenities */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Tiện Ích Phòng Trọ</h3>
            <p className="text-xs text-slate-500">
              Chọn các tiện ích thực tế có sẵn trong phòng hoặc khu trọ
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
              {amenities.map((amenity) => {
                const isChecked = selectedAmenities.includes(amenity.tenTienIch);
                return (
                  <div
                    key={amenity.maTienIch}
                    onClick={() => handleToggleAmenity(amenity.tenTienIch)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                      isChecked
                        ? 'border-cyan-500 bg-cyan-50/50 text-cyan-800 ring-1 ring-cyan-500/50'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{amenity.tenTienIch}</span>
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center ${
                        isChecked ? 'bg-cyan-600 text-white' : 'border border-slate-300'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Images + Basic Information */}
        <div className="space-y-6">
          {/* Section: Upload Images from Computer / Drag & Drop */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Hình Ảnh Thực Tế Của Phòng</h3>
              <span className="text-[11px] text-slate-400">
                Đã chọn: <strong>{images.length}</strong> ảnh
              </span>
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={(e) => processFiles(e.target.files)}
              className="hidden"
            />

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-cyan-500 bg-cyan-50/50 ring-2 ring-cyan-500/20'
                  : 'border-slate-300 hover:border-cyan-500 hover:bg-slate-50/60'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-2">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                Kéo thả hình ảnh vào đây hoặc{' '}
                <span className="text-cyan-600 underline">chọn từ máy tính (File Explorer)</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Hỗ trợ PNG, JPG, JPEG, WEBP (chọn nhiều ảnh cùng lúc)
              </p>
            </div>

            {uploadError && (
              <p className="text-xs text-red-500 font-medium">{uploadError}</p>
            )}

            {/* Grid of uploaded images */}
            {images.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video rounded-xl overflow-hidden ring-1 ring-slate-200 group bg-slate-100"
                  >
                    <img src={img} alt={`Room ${idx}`} className="w-full h-full object-cover" />

                    {/* Cover badge */}
                    {idx === 0 ? (
                      <span className="absolute top-1 left-1 bg-cyan-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-white" />
                        Ảnh bìa
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetCoverImage(idx);
                        }}
                        className="absolute top-1 left-1 bg-slate-900/60 hover:bg-cyan-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Đặt làm ảnh bìa"
                      >
                        Đặt làm bìa
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Xóa ảnh này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-300" />
                <span>Chưa có hình ảnh nào được chọn. Hãy bấm vào khung trên để tải ảnh lên.</span>
              </div>
            )}
          </div>

          {/* Section: Basic details */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Thông Tin Chi Tiết</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tiêu đề bài đăng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Phòng Studio Full Nội Thất View Đẹp Gần Đại Học..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Loại hình phòng</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.maLpt} value={c.maLpt}>
                      {c.tenLoaiPhongTro}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số người ở tối đa</label>
                <select
                  value={maxPeople}
                  onChange={(e) => setMaxPeople(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 bg-white"
                >
                  <option value="1">1 người</option>
                  <option value="2">2 người</option>
                  <option value="3">3 người</option>
                  <option value="4">4 người</option>
                  <option value="5">5+ người</option>
                </select>
              </div>
            </div>

            {/* Currency Inputs with . Separator Format */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Giá thuê hàng tháng (VNĐ) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatCurrency(price)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setPrice(raw);
                    }}
                    placeholder="VD: 3.500.000"
                    className="w-full text-xs p-3 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    đ
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiền cọc hợp đồng (VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatCurrency(deposit)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setDeposit(raw);
                    }}
                    placeholder="VD: 3.500.000"
                    className="w-full text-xs p-3 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    đ
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Diện tích (m²)</label>
                <input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="25"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả phòng & Nội quy</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết nội thất, giờ giấc, đồng hồ điện nước, các chi phí dịch vụ khác..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-800 leading-relaxed"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
