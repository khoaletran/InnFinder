import React from 'react';
import { formatVND } from '@/utils/formatters';

interface MoneyTextProps {
  amount: number | string | undefined | null;
  prefix?: string;
  suffix?: string;
  className?: string;
  unitClassName?: string;
}

export const MoneyText: React.FC<MoneyTextProps> = ({
  amount,
  prefix = '',
  suffix = '',
  className = '',
  unitClassName = 'text-[0.82em] font-normal text-text-muted ml-0.5',
}) => {
  const formatted = formatVND(amount, false);
  return (
    <span className={`tabular-nums whitespace-nowrap ${className}`.trim()}>
      {prefix}
      {formatted}
      <span className={unitClassName}>đ</span>
      {suffix}
    </span>
  );
};
