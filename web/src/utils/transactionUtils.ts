import type { TrangThaiGD } from "../types/booking.types";

export interface ResolvedRoomInfo {
  code: string;
  title: string;
  address: string;
  imageUrl: string;
}

// Bảng tra cứu thông tin phòng thực tế từ cơ sở dữ liệu MariaDB (bảng phong_tro)
const REAL_ROOMS_DB: Record<string, { address: string; title: string; image: string }> = {
  PT0111260001: {
    title: "Phòng trọ Cầu Giấy khép kín",
    address: "Số 15, Ngõ 68 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80",
  },
  PT0111260002: {
    title: "Phòng Studio Khâm Thiên tiện nghi",
    address: "Ngõ 222 Khâm Thiên, Thổ Quan, Đống Đa, Hà Nội",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format&fit=crop&q=80",
  },
  PT0111260003: {
    title: "Căn hộ mini Mễ Trì Thượng",
    address: "Số 42 Mễ Trì Thượng, Mễ Trì, Nam Từ Liêm, Hà Nội",
    image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&auto=format&fit=crop&q=80",
  },
  PT0111260004: {
    title: "Phòng gác lửng Chùa Láng",
    address: "Ngõ 185 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80",
  },
  PT0111260005: {
    title: "Phòng ban công thoáng Nguyễn Trãi",
    address: "Số 129 Nguyễn Trãi, Thượng Đình, Thanh Xuân, Hà Nội",
    image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop&q=80",
  },
  PT0111260006: {
    title: "Phòng đơn Duy Tân sinh viên",
    address: "Ngõ 78 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&auto=format&fit=crop&q=80",
  },
  PT0111260008: {
    title: "Studio cao cấp Dịch Vọng Hậu",
    address: "Ngõ 36 Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
    image: "https://images.unsplash.com/photo-1540518614846-7ede433c4ef9?w=600&auto=format&fit=crop&q=80",
  },
};

/**
 * Trích xuất mã phòng thực tế từ chuỗi nội dung giao dịch trên database
 * Ví dụ: "Tạm giữ cọc xem phòng PT0111260002 (Mã lịch: DL20261107004)" -> PT0111260002
 */
export function extractRoomCode(noiDung?: string): string | null {
  if (!noiDung) return null;
  const match = noiDung.match(/(PT\d{8,12})/);
  return match ? match[1] : null;
}

/**
 * Tra cứu thông tin phòng thực tế liên kết với giao dịch
 */
export function resolveRoomInfo(noiDung?: string): ResolvedRoomInfo | null {
  const code = extractRoomCode(noiDung);
  if (!code) return null;

  const room = REAL_ROOMS_DB[code];
  if (room) {
    return {
      code,
      title: room.title,
      address: room.address,
      imageUrl: room.image,
    };
  }

  return {
    code,
    title: `Phòng trọ mã #${code}`,
    address: "Khu vực trung tâm TP. Hà Nội",
    imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80",
  };
}

/**
 * Hiển thị nhãn loại giao dịch tiếng Việt thân thiện
 */
export function formatTransactionType(loaiGiaoDich?: string): { label: string; method: string } {
  switch (loaiGiaoDich) {
    case "COC_XEM_PHONG":
      return { label: "Cọc giữ chân xem phòng", method: "Ví InnFinder" };
    case "HOAN_COC":
      return { label: "Hoàn tiền cọc xem phòng", method: "Ví InnFinder" };
    case "CONG_TIEN_COC":
      return { label: "Cộng cọc sau khi chốt thuê", method: "Hệ thống sàn" };
    case "RUT_TIEN":
      return { label: "Rút tiền về tài khoản", method: "Tài khoản ngân hàng" };
    default:
      return { label: loaiGiaoDich || "Giao dịch hệ thống", method: "Ví InnFinder" };
  }
}

/**
 * Hiển thị cấu hình Badge trạng thái giao dịch chuẩn Java Enum TrangThaiGD
 */
export function getTransactionStatusBadge(status: TrangThaiGD) {
  switch (status) {
    case "THANH_CONG":
      return {
        label: "Thành công",
        bgClass: "bg-emerald-50",
        textClass: "text-emerald-700",
        borderClass: "border-emerald-200",
        dotClass: "bg-emerald-500",
      };
    case "CHO_THANH_TOAN":
      return {
        label: "Đang xử lý",
        bgClass: "bg-amber-50",
        textClass: "text-amber-700",
        borderClass: "border-amber-200",
        dotClass: "bg-amber-500",
      };
    case "HOAN_TIEN":
      return {
        label: "Hoàn tiền",
        bgClass: "bg-sky-50",
        textClass: "text-sky-700",
        borderClass: "border-sky-200",
        dotClass: "bg-sky-500",
      };
    case "THAT_BAI":
    default:
      return {
        label: "Thất bại",
        bgClass: "bg-rose-50",
        textClass: "text-rose-600",
        borderClass: "border-rose-200",
        dotClass: "bg-rose-500",
      };
  }
}
