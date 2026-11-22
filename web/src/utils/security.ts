/**
 * Chỉ chấp nhận đường dẫn nội bộ bắt đầu bằng "/" (chặn "//", "http", "://", "\")
 * để phòng tránh lỗ hổng Open Redirect sau khi đăng nhập.
 */
export function getSafeReturnUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//') || trimmed.includes('://') || trimmed.includes('\\')) {
    return null;
  }
  return trimmed;
}

/**
 * Che số CCCD theo mặc định, chỉ giữ 3 ký tự cuối (VD: •••••••••452).
 */
export function maskCccd(cccd?: string | null): string {
  if (!cccd) return 'Chưa cập nhật';
  const cleaned = cccd.trim();
  if (cleaned.length <= 3) return '•••••••••';
  return `•••••••••${cleaned.slice(-3)}`;
}

/**
 * Che số tài khoản ngân hàng theo mặc định (VD: 123456 -> ••••56, 1234567890 -> ••••7890).
 */
export function maskBankAccount(accountNumber?: string | null): string {
  if (!accountNumber) return '••••';
  const cleaned = accountNumber.trim();
  if (cleaned.length <= 2) return '••••';
  const visibleCount = cleaned.length <= 6 ? 2 : 4;
  return `••••${cleaned.slice(-visibleCount)}`;
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Kiểm tra dung lượng <= 5MB và định dạng ảnh thật qua magic bytes (JPG, PNG, WebP).
 */
export async function validateAvatarFile(file: File): Promise<string | null> {
  if (file.size > MAX_AVATAR_BYTES) {
    return 'Dung lượng ảnh không được vượt quá 5MB.';
  }

  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  if (!isJpeg && !isPng && !isWebp) {
    return 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP hợp lệ.';
  }

  return null;
}
