import type { TrangThaiGD } from '@/types/transaction.types';

export interface ResolvedRoomInfo {
  code: string;
  title: string;
  address: string;
}

export const formatVND = (
  amount: number | string | undefined | null,
  showUnit: boolean = true,
  unit: string = 'đ',
): string => {
  if (amount === undefined || amount === null || amount === '') {
    return showUnit ? `0 ${unit}` : '0';
  }
  const num =
    typeof amount === 'string' ? Number(amount.replace(/[^\d.-]/g, '')) : Number(amount);
  if (isNaN(num)) {
    return showUnit ? `0 ${unit}` : '0';
  }
  const formatted = Math.round(num).toLocaleString('vi-VN');
  return showUnit ? `${formatted} ${unit}` : formatted;
};

export const formatCurrencyInput = (
  val: string | number | undefined | null,
): string => {
  if (val === undefined || val === null || val === '') return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
};

export const formatVNDShort = (
  amount: number | string | null | undefined,
  suffix: string = '/tháng',
): string => {
  if (amount === null || amount === undefined || amount === '') {
    return `0 ₫${suffix}`;
  }
  const num =
    typeof amount === 'string' ? Number(amount.replace(/[^\d.-]/g, '')) : Number(amount);
  if (isNaN(num)) {
    return `0 ₫${suffix}`;
  }
  if (Math.abs(num) >= 1_000_000) {
    const millions = num / 1_000_000;
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
    return `${formatted} triệu${suffix}`;
  }
  return `${formatVND(num)}${suffix}`;
};

export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '--/--/----';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return '--:-- --/--/----';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatRelativeTime = (dateString?: string | null): string => {
  if (!dateString) return 'Vừa xong';
  try {
    const now = Date.now();
    const d = new Date(dateString).getTime();
    if (isNaN(d)) return dateString;
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Vừa xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return formatDate(dateString);
  } catch {
    return dateString;
  }
};

export const formatPhoneNumber = (phone?: string | null): string => {
  if (!phone) return '---';
  const cleaned = phone.trim();
  if (cleaned.startsWith('+84') && cleaned.length === 12) {
    const local = '0' + cleaned.slice(3);
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  if (/^\d{10}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return cleaned;
};

const extractRoomCode = (noiDung?: string): string | null => {
  if (!noiDung) return null;
  const match = noiDung.match(/(PT\d{8,12})/);
  return match ? match[1] : null;
};

export const resolveRoomInfo = (noiDung?: string): ResolvedRoomInfo | null => {
  const code = extractRoomCode(noiDung);
  if (!code) return null;
  return {
    code,
    title: `Phòng trọ mã #${code}`,
    address: 'Giao dịch InnFinder',
  };
};

export const formatTransactionType = (
  loaiGiaoDich?: string,
): { label: string; method: string } => {
  switch (loaiGiaoDich) {
    case 'COC_XEM_PHONG':
      return { label: 'Cọc giữ chân xem phòng', method: 'Hệ thống InnFinder' };
    case 'HOAN_COC':
      return { label: 'Hoàn trả tiền cọc xem phòng', method: 'Ví InnFinder' };
    case 'CONG_TIEN_COC':
      return { label: 'Nhận cọc sau khi trừ phí hoa hồng sàn', method: 'Ví Chủ trọ' };
    case 'BOI_THUONG_NO_SHOW':
      return { label: 'Bồi thường cọc khách No-show', method: 'Chuyển vào Ví Chủ trọ' };
    case 'BOI_THUONG_HUY_SAT_GIO':
      return { label: 'Bồi thường cọc hủy sát giờ', method: 'Chuyển vào Ví Chủ trọ' };
    case 'THU_HOA_HONG':
      return { label: 'Phí hoa hồng môi giới sàn', method: 'Hệ thống InnFinder' };
    case 'RUT_TIEN':
    case 'YEU_CAU_RUT_TIEN':
      return { label: 'Rút tiền về tài khoản ngân hàng', method: 'Chuyển khoản ngân hàng' };
    default:
      return { label: loaiGiaoDich || 'Giao dịch hệ thống', method: 'Ví InnFinder' };
  }
};

export const getTransactionStatusBadge = (status: TrangThaiGD) => {
  switch (status) {
    case 'THANH_CONG':
      return {
        label: 'Thành công',
        bgClass: 'bg-success-bg',
        textClass: 'text-success-text',
        borderClass: 'border-transparent',
        dotClass: 'bg-success-text',
      };
    case 'CHO_THANH_TOAN':
      return {
        label: 'Chờ thanh toán',
        bgClass: 'bg-warning-bg',
        textClass: 'text-warning-text',
        borderClass: 'border-transparent',
        dotClass: 'bg-warning-text',
      };
    case 'HOAN_TIEN':
      return {
        label: 'Hoàn tiền',
        bgClass: 'bg-info-bg',
        textClass: 'text-info-text',
        borderClass: 'border-transparent',
        dotClass: 'bg-info-text',
      };
    case 'THAT_BAI':
    default:
      return {
        label: 'Thất bại',
        bgClass: 'bg-danger-bg',
        textClass: 'text-danger-text',
        borderClass: 'border-transparent',
        dotClass: 'bg-danger-text',
      };
  }
};

/**
 * Chuẩn hóa & kiểm tra tọa độ kinh độ / vĩ độ phòng trọ (tự động đảo nếu lưu ngược lat/lng)
 */
export const getValidCoords = (room: {
  viDo?: string | number;
  kinhDo?: string | number;
}): { lat: number; lng: number } | null => {
  if (room.viDo === undefined || room.kinhDo === undefined) return null;
  const c1 = typeof room.viDo === 'number' ? room.viDo : parseFloat(room.viDo);
  const c2 = typeof room.kinhDo === 'number' ? room.kinhDo : parseFloat(room.kinhDo);
  if (isNaN(c1) || isNaN(c2)) return null;

  let lat = c1;
  let lng = c2;

  if (c1 > 90 && c2 <= 90) {
    lat = c2;
    lng = c1;
  } else if (c2 > 90 && c1 <= 90) {
    lat = c1;
    lng = c2;
  }

  if (lat < -90 || lat > 90) return null;
  return { lat, lng };
};
