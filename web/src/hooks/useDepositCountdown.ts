import { useEffect, useRef, useState } from 'react';

const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

interface UseDepositCountdownOptions {
  thoiGianDat?: string;
  enabled: boolean;
  onExpire?: () => void;
}

export function useDepositCountdown({
  thoiGianDat,
  enabled,
  onExpire,
}: UseDepositCountdownOptions) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const expiredTriggeredRef = useRef(false);

  const deadlineMs = thoiGianDat
    ? new Date(thoiGianDat).getTime() + PAYMENT_WINDOW_MS
    : null;

  const isValidDeadline = deadlineMs !== null && !Number.isNaN(deadlineMs);
  const remainingMs =
    enabled && isValidDeadline ? Math.max(0, deadlineMs - nowMs) : null;
  const isExpired = remainingMs !== null && remainingMs <= 0;

  useEffect(() => {
    expiredTriggeredRef.current = false;
  }, [thoiGianDat, enabled]);

  useEffect(() => {
    if (!enabled || !isValidDeadline || isExpired) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [enabled, isValidDeadline, isExpired]);

  useEffect(() => {
    if (enabled && isExpired && onExpire && !expiredTriggeredRef.current) {
      expiredTriggeredRef.current = true;
      onExpire();
    }
  }, [enabled, isExpired, onExpire]);

  let formattedTime: string | null = null;
  if (remainingMs !== null) {
    const totalSec = Math.ceil(remainingMs / 1000);
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    formattedTime = `${mins}:${secs}`;
  }

  return {
    remainingMs,
    formattedTime,
    isExpired,
  };
}
