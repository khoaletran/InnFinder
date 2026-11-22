import React, { useEffect, useRef, useState } from 'react';
import { InnFinderPinIcon } from '@/components/common/InnFinderLogo';

interface StationPoint {
  x: number;
  y: number;
  percent: number;
}

const MAP_WIDTH = 360;
const MAP_HEIGHT = 216;

const STATIONS: StationPoint[] = [
  { x: 46, y: 156, percent: 0 },
  { x: 112, y: 78, percent: 25 },
  { x: 180, y: 148, percent: 50 },
  { x: 248, y: 76, percent: 75 },
  { x: 314, y: 136, percent: 100 },
];

const NORMAL_HOP_MS = 380;
const FAST_HOP_MS = 145;
const NORMAL_BEAT_MS = 75;
const FAST_BEAT_MS = 28;
const FINISH_SETTLE_MS = 200;

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export interface MapJourneyLoaderProps {
  /** Khi true, Pin tăng tốc mượt mà qua các mốc còn lại đến 100% mà không ngắt cú nhảy hiện tại */
  isDataReady?: boolean;
  /** Callback gọi sau khi Pin đáp chuẩn tại mốc 100% */
  onComplete?: () => void;
  /** Thông điệp hiển thị dưới bản đồ */
  message?: string;
  /** Phiên bản gọn dùng cho khu vực nhỏ */
  compact?: boolean;
}

export const MapJourneyLoader: React.FC<MapJourneyLoaderProps> = ({
  isDataReady = false,
  onComplete,
  message = 'Đang tải dữ liệu trang...',
  compact = false,
}) => {
  const [reachedIndex, setReachedIndex] = useState(0);
  const [rippleIndex, setRippleIndex] = useState<number | null>(null);

  const isDataReadyRef = useRef(isDataReady);
  const onCompleteRef = useRef(onComplete);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isDataReadyRef.current = isDataReadyRef.current || isDataReady;
  }, [isDataReady]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const applyPinTransform = (x: number, y: number, arcLift: number, tiltDeg: number) => {
      const effectiveLift = prefersReducedMotion ? 0 : arcLift;
      const effectiveTilt = prefersReducedMotion ? 0 : tiltDeg;
      const scaleBounce = 1 + 0.18 * effectiveLift;
      const liftPx = -54 * effectiveLift;

      if (pinRef.current) {
        pinRef.current.style.transform = `translate3d(${x - 20}px, ${y - 38 + liftPx}px, 0) scale(${scaleBounce}) rotate(${effectiveTilt}deg)`;
      }
      if (shadowRef.current) {
        const shadowScale = 1 - 0.55 * effectiveLift;
        const shadowOpacity = 0.28 - 0.18 * effectiveLift;
        shadowRef.current.style.opacity = String(shadowOpacity);
        shadowRef.current.style.transform = `translate3d(${x - 11}px, ${y - 4}px, 0) scale(${shadowScale}, ${shadowScale * 0.55})`;
      }
    };

    applyPinTransform(STATIONS[0].x, STATIONS[0].y, 0, 0);

    type Phase = 'HOPPING' | 'BEAT' | 'WAITING_AT_75' | 'SETTLE_100' | 'DONE';
    let phase: Phase = 'HOPPING';
    let fromIdx = 0;
    let toIdx = 1;
    let hopProgress = 0;
    let phaseElapsed = 0;
    let lastTime = performance.now();
    let rafId: number | null = null;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;

      if (phase === 'HOPPING') {
        const hopDuration = isDataReadyRef.current ? FAST_HOP_MS : NORMAL_HOP_MS;
        hopProgress = Math.min(hopProgress + dt / hopDuration, 1);

        const from = STATIONS[fromIdx];
        const to = STATIONS[toIdx];
        const eased = easeInOutCubic(hopProgress);
        const x = from.x + (to.x - from.x) * eased;
        const y = from.y + (to.y - from.y) * eased;
        const arcLift = Math.sin(Math.PI * hopProgress);
        const tiltDir = to.y < from.y ? -1 : 1;
        const tiltDeg = Math.sin(Math.PI * hopProgress * 1.2) * 12 * tiltDir;

        applyPinTransform(x, y, arcLift, tiltDeg);

        if (hopProgress >= 1) {
          applyPinTransform(to.x, to.y, 0, 0);
          setReachedIndex(toIdx);
          setRippleIndex(toIdx);
          phaseElapsed = 0;

          if (toIdx === STATIONS.length - 1) {
            phase = 'SETTLE_100';
          } else if (toIdx === STATIONS.length - 2 && !isDataReadyRef.current) {
            phase = 'WAITING_AT_75';
          } else {
            phase = 'BEAT';
          }
        }
      } else if (phase === 'BEAT') {
        phaseElapsed += dt;
        const beatDuration = isDataReadyRef.current ? FAST_BEAT_MS : NORMAL_BEAT_MS;
        if (phaseElapsed >= beatDuration) {
          fromIdx = toIdx;
          toIdx = toIdx + 1;
          hopProgress = 0;
          phase = 'HOPPING';
        }
      } else if (phase === 'WAITING_AT_75') {
        phaseElapsed += dt;
        const station75 = STATIONS[3];
        const gentleBob = prefersReducedMotion
          ? 0
          : Math.abs(Math.sin(phaseElapsed * 0.005)) * 0.14;
        applyPinTransform(station75.x, station75.y, gentleBob, 0);

        if (isDataReadyRef.current) {
          fromIdx = 3;
          toIdx = 4;
          hopProgress = 0;
          phase = 'HOPPING';
        }
      } else if (phase === 'SETTLE_100') {
        phaseElapsed += dt;
        if (phaseElapsed >= FINISH_SETTLE_MS) {
          phase = 'DONE';
          onCompleteRef.current?.();
          return;
        }
      }

      if (phase !== 'DONE') {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const currentPercent = STATIONS[reachedIndex]?.percent ?? 0;
  const routePath = `M ${STATIONS[0].x} ${STATIONS[0].y} L ${STATIONS[1].x} ${STATIONS[1].y} L ${STATIONS[2].x} ${STATIONS[2].y} L ${STATIONS[3].x} ${STATIONS[3].y} L ${STATIONS[4].x} ${STATIONS[4].y}`;
  const completedPath =
    reachedIndex > 0
      ? STATIONS.slice(0, reachedIndex + 1)
          .map((s, idx) => `${idx === 0 ? 'M' : 'L'} ${s.x} ${s.y}`)
          .join(' ')
      : '';
  const activeRippleStation = rippleIndex !== null ? STATIONS[rippleIndex] : null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${message} ${currentPercent}%`}
      className={`flex flex-col items-center justify-center select-none ${
        compact ? 'py-8 px-4' : 'py-10 px-6'
      }`}
    >
      <div className="w-full max-w-[380px] space-y-3.5">
        {/* Header thương hiệu */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <InnFinderPinIcon size={24} />
            <span className="text-sm font-bold tracking-tight text-accent">InnFinder</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-[var(--radius-badge)] bg-accent-soft border border-accent-border text-xs font-semibold text-accent tabular-nums">
            {currentPercent}%
          </span>
        </div>

        {/* Bản đồ hành trình 5 mốc 0 - 25 - 50 - 75 - 100 */}
        <div className="rounded-[var(--radius-card)] bg-accent-soft border border-accent-border shadow-[var(--shadow-card-hover)] flex items-center justify-center overflow-hidden">
          <div className="relative shrink-0" style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}>
            {/* brand-exception: SVG illustration map palette */}
            <svg width={MAP_WIDTH} height={MAP_HEIGHT} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
              {/* Nền bản đồ phẳng (không dùng gradient) */}
              <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} rx="12" fill="#F0FDFA" /* brand-exception */ />

              {/* Công viên & khối nhà */}
              <rect x="14" y="16" width="76" height="44" rx="8" fill="#DCFCE7" opacity="0.75" /* brand-exception */ />
              <rect x="136" y="14" width="74" height="40" rx="6" fill="#E2E8F0" opacity="0.6" /* brand-exception */ />
              <rect x="268" y="152" width="78" height="48" rx="8" fill="#DCFCE7" opacity="0.7" /* brand-exception */ />
              <rect x="18" y="88" width="58" height="44" rx="6" fill="#E2E8F0" opacity="0.55" /* brand-exception */ />
              <rect x="134" y="164" width="84" height="38" rx="6" fill="#E2E8F0" opacity="0.55" /* brand-exception */ />
              <rect x="278" y="18" width="66" height="42" rx="6" fill="#E2E8F0" opacity="0.55" /* brand-exception */ />

              {/* Dòng sông uốn lượn */}
              <path
                d="M -10 116 Q 95 96, 178 122 T 370 104"
                stroke="#BAE6FD" /* brand-exception */
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
              />

              {/* Lưới đường phố trắng */}
              <line x1="0" y1="78" x2={MAP_WIDTH} y2="78" stroke="#FFFFFF" strokeWidth="5" /* brand-exception */ />
              <line x1="0" y1="152" x2={MAP_WIDTH} y2="152" stroke="#FFFFFF" strokeWidth="5" /* brand-exception */ />
              <line x1="112" y1="0" x2="112" y2={MAP_HEIGHT} stroke="#FFFFFF" strokeWidth="5" /* brand-exception */ />
              <line x1="248" y1="0" x2="248" y2={MAP_HEIGHT} stroke="#FFFFFF" strokeWidth="5" /* brand-exception */ />

              {/* Tuyến hành trình dự kiến nét đứt */}
              <path
                d={routePath}
                stroke="#99F6E4" /* brand-exception */
                strokeWidth="3.5"
                strokeDasharray="6, 5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Tuyến đã đi qua */}
              {completedPath && (
                <path
                  d={completedPath}
                  stroke="#0F766E" /* brand-exception */
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* 5 trạm mốc */}
              {STATIONS.map((station, idx) => {
                const isReached = idx <= reachedIndex;
                return (
                  <g key={station.percent}>
                    <circle
                      cx={station.x}
                      cy={station.y}
                      r={isReached ? 13 : 10}
                      fill={isReached ? '#CCFBF1' : '#E2E8F0'} /* brand-exception */
                      opacity="0.9"
                    />
                    <circle
                      cx={station.x}
                      cy={station.y}
                      r={6.5}
                      fill={isReached ? '#0F766E' : '#94A3B8'} /* brand-exception */
                    />
                    <circle cx={station.x} cy={station.y} r="2.6" fill="#FFFFFF" /* brand-exception */ />
                  </g>
                );
              })}
            </svg>

            {/* Nhãn % cho từng trạm */}
            {STATIONS.map((station, idx) => {
              const isReached = idx <= reachedIndex;
              const labelTop = station.y < 100 ? station.y - 30 : station.y + 14;
              return (
                <div
                  key={station.percent}
                  style={{
                    left: station.x,
                    top: labelTop,
                    transform: 'translateX(-50%)',
                  }}
                  className={`absolute px-2 py-0.5 rounded-[var(--radius-badge)] text-[10px] font-semibold tracking-tight tabular-nums transition-colors ${
                    isReached
                      ? 'bg-accent text-white'
                      : 'bg-surface/90 text-text-muted border border-border'
                  }`}
                >
                  {station.percent}%
                </div>
              );
            })}

            {/* Sóng lan tỏa tại trạm vừa đáp */}
            {activeRippleStation && (
              <div
                key={rippleIndex}
                style={{
                  left: activeRippleStation.x - 20,
                  top: activeRippleStation.y - 20,
                  width: 40,
                  height: 40,
                }}
                className="absolute rounded-full border-2 border-accent bg-accent/15 animate-ping pointer-events-none"
              />
            )}

            {/* Bóng đổ của Pin */}
            <div
              ref={shadowRef}
              style={{
                left: 0,
                top: 0,
                width: 22,
                height: 9,
                borderRadius: 11,
                backgroundColor: 'var(--text)',
                opacity: 0.24,
              }}
              className="absolute pointer-events-none"
            />

            {/* Pin InnFinder nhảy qua 5 trạm */}
            <div
              ref={pinRef}
              style={{
                left: 0,
                top: 0,
                width: 40,
                height: 40,
              }}
              className="absolute pointer-events-none"
            >
              <InnFinderPinIcon size={40} />
            </div>
          </div>
        </div>

        {/* Thanh tiến độ & thông điệp */}
        <div className="space-y-1.5 px-1">
          <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-200 ease-out"
              style={{ width: `${currentPercent}%` }}
            />
          </div>
          <p className="text-xs font-medium text-text-secondary text-center">
            {currentPercent === 100 ? 'Đã sẵn sàng!' : message}
          </p>
        </div>
      </div>
    </div>
  );
};
