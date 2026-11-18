export interface BankInfo {
  code: string;
  shortName: string;
  fullName: string;
  name: string;
  logoUrl: string;
}

export const VIETNAM_BANKS: BankInfo[] = [
  {
    code: 'VCB',
    shortName: 'Vietcombank',
    fullName: 'Ngân hàng Ngoại thương Việt Nam',
    name: 'Ngân hàng Ngoại thương Việt Nam',
    logoUrl:
      'https://res.cloudinary.com/mi38qjmj/image/upload/v1794127483/innfinder/banks/bank_VCB.png',
  },
  {
    code: 'MB',
    shortName: 'MBBank',
    fullName: 'Ngân hàng Quân đội',
    name: 'Ngân hàng Quân đội',
    logoUrl:
      'https://res.cloudinary.com/mi38qjmj/image/upload/v1794127510/innfinder/banks/bank_MB.png',
  },
  {
    code: 'TCB',
    shortName: 'Techcombank',
    fullName: 'Ngân hàng Kỹ thương Việt Nam',
    name: 'Ngân hàng Kỹ thương Việt Nam',
    logoUrl:
      'https://res.cloudinary.com/mi38qjmj/image/upload/v1794127511/innfinder/banks/bank_TCB.png',
  },
  {
    code: 'BIDV',
    shortName: 'BIDV',
    fullName: 'Ngân hàng Đầu tư và Phát triển Việt Nam',
    name: 'Ngân hàng Đầu tư và Phát triển Việt Nam',
    logoUrl:
      'https://res.cloudinary.com/mi38qjmj/image/upload/v1794127512/innfinder/banks/bank_BIDV.png',
  },
  {
    code: 'ICB',
    shortName: 'VietinBank',
    fullName: 'Ngân hàng Công thương Việt Nam',
    name: 'Ngân hàng Công thương Việt Nam',
    logoUrl:
      'https://res.cloudinary.com/mi38qjmj/image/upload/v1794127512/innfinder/banks/bank_ICB.png',
  },
  {
    code: 'VBA',
    shortName: 'Agribank',
    fullName: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn',
    name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn',
    logoUrl:
      'https://res.cloudinary.com/mi38qjmj/image/upload/v1794127513/innfinder/banks/bank_VBA.png',
  },
  {
    code: 'VPB',
    shortName: 'VPBank',
    fullName: 'Ngân hàng Việt Nam Thịnh Vượng',
    name: 'Ngân hàng Việt Nam Thịnh Vượng',
    logoUrl:
      'https://res.cloudinary.com/mi38qjmj/image/upload/v1794127514/innfinder/banks/bank_VPB.png',
  },
  {
    code: 'ACB',
    shortName: 'ACB',
    fullName: 'Ngân hàng Á Châu',
    name: 'Ngân hàng Á Châu',
    logoUrl:
      'https://res.cloudinary.com/mi38qjmj/image/upload/v1794127514/innfinder/banks/bank_ACB.png',
  },
  {
    code: 'TPB',
    shortName: 'TPBank',
    fullName: 'Ngân hàng Tiên Phong',
    name: 'Ngân hàng Tiên Phong',
    logoUrl:
      'https://res.cloudinary.com/mi38qjmj/image/upload/v1794127515/innfinder/banks/bank_TPB.png',
  },
  {
    code: 'STB',
    shortName: 'Sacombank',
    fullName: 'Ngân hàng Sài Gòn Thương Tín',
    name: 'Ngân hàng Sài Gòn Thương Tín',
    logoUrl:
      'https://res.cloudinary.com/mi38qjmj/image/upload/v1794127516/innfinder/banks/bank_STB.png',
  },
  {
    code: 'HDB',
    shortName: 'HDBank',
    fullName: 'Ngân hàng Phát triển TPHCM',
    name: 'Ngân hàng Phát triển TPHCM',
    logoUrl:
      'https://res.cloudinary.com/mi38qjmj/image/upload/v1794127517/innfinder/banks/bank_HDB.png',
  },
  {
    code: 'VIB',
    shortName: 'VIB',
    fullName: 'Ngân hàng Quốc tế Việt Nam',
    name: 'Ngân hàng Quốc tế Việt Nam',
    logoUrl:
      'https://res.cloudinary.com/mi38qjmj/image/upload/v1794127518/innfinder/banks/bank_VIB.png',
  },
];

export const BANKS = VIETNAM_BANKS;
