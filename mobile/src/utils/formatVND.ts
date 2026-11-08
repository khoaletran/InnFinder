/**
 * Tiện ích định dạng tiền tệ Việt Nam Đồng (VNĐ).
 */

/**
 * Định dạng số tiền sang chuẩn tiền tệ VNĐ (phân tách hàng nghìn bằng dấu chấm).
 * Ví dụ:
 *  formatVND(3500000) => "3.500.000 đ"
 *  formatVND(3500000, false) => "3.500.000"
 *  formatVND(3500000, true, "VNĐ") => "3.500.000 VNĐ"
 *
 * @param amount Giá trị số tiền (number, string, null, undefined)
 * @param showUnit Có hiển thị đơn vị 'đ' ở cuối hay không (mặc định: true)
 * @param unit Đơn vị tiền tệ (mặc định: 'đ')
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

/**
 * Định dạng số tiền rút gọn thành triệu/tháng nếu >= 1.000.000 đ hoặc đ/tháng.
 * Ví dụ:
 *  formatVNDShort(3500000) => "3.5 triệu/tháng"
 *  formatVNDShort(3000000) => "3 triệu/tháng"
 *  formatVNDShort(800000) => "800.000 đ/tháng"
 *
 * @param amount Giá trị số tiền
 * @param suffix Hậu tố đi kèm (mặc định: '/tháng')
 */
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
