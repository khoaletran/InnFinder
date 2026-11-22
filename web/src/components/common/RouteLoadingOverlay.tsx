import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { MapJourneyLoader } from './MapJourneyLoader';

interface RouteLoadingOverlayProps {
  message?: string;
}

const ROUTE_SETTLE_GRACE_MS = 120;
const SAFETY_READY_TIMEOUT_MS = 10000;
const FADE_OUT_MS = 220;

const RouteLoadingSession: React.FC<{ message?: string }> = ({ message }) => {
  const isFetching = useIsFetching();
  const [visible, setVisible] = useState(true);
  const [gracePassed, setGracePassed] = useState(false);
  const [forcedReady, setForcedReady] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const graceTimer = window.setTimeout(() => {
      setGracePassed(true);
    }, ROUTE_SETTLE_GRACE_MS);

    const safetyTimer = window.setTimeout(() => {
      setForcedReady(true);
    }, SAFETY_READY_TIMEOUT_MS);

    return () => {
      window.clearTimeout(graceTimer);
      window.clearTimeout(safetyTimer);
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);

  const isDataReady = forcedReady || (gracePassed && isFetching === 0);

  const handleComplete = useCallback(() => {
    setIsFadingOut(true);
    fadeTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      setIsFadingOut(false);
    }, FADE_OUT_MS);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 z-30 bg-slate-50/55 backdrop-blur-md flex items-start justify-center pt-12 sm:pt-20 transition-opacity duration-200 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="sticky top-24 w-full flex justify-center">
        <MapJourneyLoader
          isDataReady={isDataReady}
          onComplete={handleComplete}
          message={message}
        />
      </div>
    </div>
  );
};

export const RouteLoadingOverlay: React.FC<RouteLoadingOverlayProps> = ({
  message = 'Đang tải dữ liệu trang...',
}) => {
  const location = useLocation();
  return <RouteLoadingSession key={location.pathname} message={message} />;
};
