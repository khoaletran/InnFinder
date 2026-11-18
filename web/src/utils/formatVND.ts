/**
 * Tiện ích định dạng tiền tệ Việt Nam Đồng (VNĐ) cho InnFinder Web.
 */

export function formatVND(
  amount: number | string | null | undefined,
  showUnit: boolean = true,
  unit: string = 'đ'
): string {
  if (amount === null || amount === undefined || amount === '') {
    return showUnit ? `0 ${unit}` : '0';
  }

  const num = typeof amount === 'string' ? Number(amount.replace(/[^\d.-]/g, '')) : Number(amount);

  if (isNaN(num)) {
    return showUnit ? `0 ${unit}` : '0';
  }

  const formatted = Math.round(num).toLocaleString('vi-VN');
  return showUnit ? `${formatted} ${unit}` : formatted;
}

export function formatVNDShort(
  amount: number | string | null | undefined,
  suffix: string = '/tháng'
): string {
  if (amount === null || amount === undefined || amount === '') {
    return `0 đ${suffix}`;
  }

  const num = typeof amount === 'string' ? Number(amount.replace(/[^\d.-]/g, '')) : Number(amount);

  if (isNaN(num)) {
    return `0 đ${suffix}`;
  }

  if (Math.abs(num) >= 1_000_000) {
    const millions = num / 1_000_000;
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
    return `${formatted} triệu${suffix}`;
  }

  return `${formatVND(num)}${suffix}`;
}

export default formatVND;
