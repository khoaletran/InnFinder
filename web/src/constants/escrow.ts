/**
 * Cấu hình tài khoản nhận cọc giữ chân lịch xem phòng của Sàn InnFinder.
 * Cấu hình theo tài khoản MBBank cá nhân (Napas 247).
 */
export const ESCROW_ACCOUNT_CONFIG = {
  bin: '970422',
  bankName: 'MBBank - Ngân hàng TMCP Quân Đội',
  shortName: 'MBBank',
  bankCode: 'MB',
  accountNumber: '0939080305',
  accountName: 'DO MINH QUAN',
  template: 'compact',
};

/**
 * Sinh URL ảnh mã QR động VietQR theo chuẩn Quicklink của vietqr.app
 * @param amount Số tiền cọc cần nộp (VNĐ)
 * @param transferMemo Cú pháp nội dung đối soát (VD: IFCOC123456)
 */
export function buildDynamicVietQrUrl(amount: number, transferMemo: string): string {
  const { shortName, accountNumber, template, accountName } = ESCROW_ACCOUNT_CONFIG;
  const encodedName = encodeURIComponent(accountName.trim());
  const encodedMemo = encodeURIComponent(transferMemo.trim());
  const safeAmount = Math.max(0, Math.round(amount));

  return `https://vietqr.app/img?bank=${shortName}&acc=${accountNumber}&template=${template}&showinfo=true&holder=${encodedName}&amount=${safeAmount}&des=${encodedMemo}`;
}
