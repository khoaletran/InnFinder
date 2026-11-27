import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronDown,
  History,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { chatService } from "@/services/chat.service";
import { ROOM_CHAT_REFERENCE_PATTERN } from "@/constants/ai";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useRoomFilterStore } from "@/store/useRoomFilterStore";
import type { ChatRequest } from "@/types/chat.types";
import type { RoomSummaryResponse } from "@/types/room.types";
import { resolveBestPlaceMatch } from "@/utils/geocoding";
import { ChatRoomCard } from "./ChatRoomCard";

const STARTERS = [
  "Phòng dưới 3 triệu ở Gò Vấp",
  "Phòng cho 2 người, có máy lạnh",
  "Cọc xem phòng được hoàn thế nào?",
];

const NEARBY_PHRASES = [
  "gan vi tri",
  "vi tri cua toi",
  "vi tri hien tai",
  "gan toi",
  "gan cho toi",
  "gan minh",
  "gan day",
  "quanh day",
  "quanh toi",
  "quanh vi tri",
  "xung quanh",
  "o gan day",
  "o gan toi",
];

const LAUNCHER_POS_KEY = "innfinder:chatbot-launcher-pos";
const LAUNCHER_HEIGHT = 56;
const LAUNCHER_MIN_Y = 72;
const DRAG_THRESHOLD_PX = 6;

interface LauncherDockPos {
  side: "left" | "right";
  yRatio: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function loadLauncherDockPos(): LauncherDockPos {
  if (typeof window === "undefined") return { side: "right", yRatio: 1 };
  try {
    const raw = window.localStorage.getItem(LAUNCHER_POS_KEY);
    if (!raw) return { side: "right", yRatio: 1 };
    const parsed = JSON.parse(raw) as Partial<LauncherDockPos>;
    const side = parsed.side === "left" ? "left" : "right";
    const yRatio =
      typeof parsed.yRatio === "number" && Number.isFinite(parsed.yRatio)
        ? clamp(parsed.yRatio, 0, 1)
        : 1;
    return { side, yRatio };
  } catch {
    return { side: "right", yRatio: 1 };
  }
}

function saveLauncherDockPos(pos: LauncherDockPos): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAUNCHER_POS_KEY, JSON.stringify(pos));
  } catch {
    // Bỏ qua nếu trình duyệt chặn storage
  }
}

function getLauncherBounds(
  viewportW: number,
  viewportH: number,
  buttonW: number,
  buttonH: number,
) {
  const edgeInset = viewportW >= 1024 ? 24 : 16;
  const bottomSafe = viewportW >= 1024 ? 24 : 84;
  const minX = edgeInset;
  const maxX = Math.max(minX, viewportW - buttonW - edgeInset);
  const minY = LAUNCHER_MIN_Y;
  const maxY = Math.max(minY, viewportH - buttonH - bottomSafe);
  return { edgeInset, minX, maxX, minY, maxY };
}

function formatSessionTime(timestamp: number): string {
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60_000);
  if (diffMinutes < 1) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return new Date(timestamp).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

const GENERIC_PLACE_STOPWORDS = new Set([
  "day",
  "toi",
  "minh",
  "nha",
  "cho",
  "truong",
  "duong",
  "pho",
  "tram",
  "ben",
  "trung tam",
  "vi tri",
  "truong hoc",
  "sieu thi",
  "cong vien",
  "benh vien",
  "khu vuc",
]);

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function isNearbyLocationPrompt(text: string): boolean {
  const normalized = normalizeForMatch(text);
  return NEARBY_PHRASES.some((phrase) => normalized.includes(phrase));
}

const PLACE_ACRONYM_EXPANSIONS: Array<[RegExp, string]> = [
  [/\biuh\b/giu, "Đại học Công nghiệp TP.HCM"],
  [/\bhaui\b/giu, "Đại học Công nghiệp Hà Nội"],
  [/\bhcmut\b/giu, "Đại học Bách Khoa TP.HCM"],
  [/\bhust\b/giu, "Đại học Bách Khoa Hà Nội"],
  [/\buit\b/giu, "Đại học Công nghệ Thông tin TP.HCM"],
  [/\bhcmus\b/giu, "Đại học Khoa học Tự nhiên TP.HCM"],
  [/\bueh\b/giu, "Đại học Kinh tế TP.HCM"],
  [/\bhutech\b/giu, "Đại học Công nghệ TP.HCM"],
  [/\btdtu\b/giu, "Đại học Tôn Đức Thắng"],
  [/\brmit\b/giu, "Đại học RMIT"],
  [/\bneu\b/giu, "Đại học Kinh tế Quốc dân"],
  [/\bftu\b/giu, "Đại học Ngoại thương"],
  [/\bptit\b/giu, "Học viện Công nghệ Bưu chính Viễn thông"],
  [/\bsgu\b/giu, "Đại học Sài Gòn"],
  [/\bvlu\b/giu, "Đại học Văn Lang"],
  [/\bhuflit\b/giu, "Đại học Ngoại ngữ Tin học TP.HCM"],
  [/\buth\b/giu, "Đại học Giao thông Vận tải TP.HCM"],
  [/\butc\b/giu, "Đại học Giao thông Vận tải"],
  [/\b(?:dhqg|vnu)\b/giu, "Đại học Quốc gia"],
  [/\b(?:đh|dh)\b/giu, "Đại học"],
  [/\bbv\b/giu, "Bệnh viện"],
  [/\bkcn\b/giu, "Khu công nghiệp"],
  [/\bbx\b/giu, "Bến xe"],
  [/\btttm\b/giu, "Trung tâm thương mại"],
];

function extractNearbyPlaceQuery(text: string): string | null {
  if (isNearbyLocationPrompt(text)) return null;
  const normalized = normalizeForMatch(text);
  if (
    normalized.includes("phong nay") ||
    normalized.includes("phong thu") ||
    /\b(?:khong|bao xa|bao nhieu)\s*\??$/i.test(normalized)
  ) {
    return null;
  }

  const trimmed = text.trim();
  const markerMatch = trimmed.match(
    /(?:^|\s)(?:gần|gan|quanh|cạnh|canh|sát|sat)\s+([^?.!]+)$/iu,
  );
  if (!markerMatch) return null;

  let candidate = markerMatch[1].trim();
  candidate = candidate.split(/[,;]/)[0].trim();
  candidate = candidate
    .replace(
      /\s+(?:giá\s+rẻ|gia\s+re|rẻ\s+hơn|re\s+hon|dưới|duoi|trên|tren|tầm|tam|khoảng|khoang|từ|tu|giá|gia|cho\s+\d+\s*(?:người|nguoi)|có\s+(?:gác|máy\s+lạnh|điều\s+hòa|wifi|ban\s+công|thang\s+máy|bãi\s+xe|tủ\s+lạnh|máy\s+giặt|nội\s+thất|bếp)|full\s+nội\s+thất|khép\s+kín|khep\s+kin|\d+\s*(?:tr|triệu|trieu|m2|m²|người|nguoi))\b.*$/iu,
      "",
    )
    .trim();

  candidate = candidate.replace(/^(?:khu\s+vực|khu\s+vuc|khu|vùng|vung)\s+/iu, "");
  for (const [pattern, replacement] of PLACE_ACRONYM_EXPANSIONS) {
    candidate = candidate.replace(pattern, replacement);
  }
  candidate = candidate.replace(/\s+/g, " ").trim();

  const normalizedCandidate = normalizeForMatch(candidate);
  if (normalizedCandidate.length < 3 || GENERIC_PLACE_STOPWORDS.has(normalizedCandidate)) {
    return null;
  }
  return candidate;
}

export function RoomChatbot() {
  const chat = useChatStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [dockPos, setDockPos] = useState<LauncherDockPos>(() => loadLauncherDockPos());
  const [dragCoords, setDragCoords] = useState<{ x: number; y: number } | null>(null);
  const [viewport, setViewport] = useState(() =>
    typeof window === "undefined"
      ? { w: 1280, h: 720 }
      : { w: window.innerWidth, h: window.innerHeight },
  );
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const pageRoomId = location.pathname.match(/^\/room\/([^/]+)\/?$/)?.[1];
  const currentRoomId =
    pageRoomId && ROOM_CHAT_REFERENCE_PATTERN.test(pageRoomId)
      ? pageRoomId
      : undefined;
  const {
    mutateAsync,
    isPending,
    reset: resetMutation,
  } = useMutation({
    mutationFn: ({
      request,
      signal,
    }: {
      request: ChatRequest;
      signal: AbortSignal;
    }) => chatService.send(request, signal),
    retry: false,
  });

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!isPending) return;
    const start = Date.now();
    const timer = window.setInterval(
      () => setWaitingSeconds(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [isPending]);

  useEffect(
    () =>
      useAuthStore.subscribe((next, previous) => {
        if (next.user?.maNguoiDung !== previous.user?.maNguoiDung) {
          requestRef.current?.abort();
          setError(null);
          setDraft("");
        }
      }),
    [],
  );

  useEffect(() => {
    if (!chat.isOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        useChatStore.getState().setOpen(false);
        window.setTimeout(() => launcherRef.current?.focus(), 0);
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onEscape);
    };
  }, [chat.isOpen]);

  const isBusy = isPending || isRequestingLocation;

  useEffect(() => {
    if (chat.isOpen)
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
  }, [chat.messages, chat.isOpen, isBusy, error]);

  function openBooking(roomId: string) {
    if (!ROOM_CHAT_REFERENCE_PATTERN.test(roomId)) return;
    const path = `/appointments/schedule/${roomId}`;
    useChatStore.getState().setOpen(false);
    if (!useAuthStore.getState().isAuthenticated) {
      navigate("/login", { state: { from: { pathname: path } } });
    } else navigate(path);
  }

  function requestCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
    const filterState = useRoomFilterStore.getState();
    if (filterState.userLat !== undefined && filterState.userLng !== undefined) {
      return Promise.resolve({ lat: filterState.userLat, lng: filterState.userLng });
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          useRoomFilterStore.getState().setUserLocation(lat, lng);
          resolve({ lat, lng });
        },
        () => resolve(null),
        { timeout: 8000, enableHighAccuracy: true },
      );
    });
  }

  async function sendMessage(text: string, selectedRoom?: RoomSummaryResponse) {
    const message = text.trim();
    if (!message || message.length > 1500 || isBusy) return;
    const state = useChatStore.getState();
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    if (selectedRoom) state.selectRoom(selectedRoom);
    state.addUser(message);
    setDraft("");
    setError(null);
    setWaitingSeconds(0);

    const filterState = useRoomFilterStore.getState();
    let coords: { lat: number; lng: number } | null =
      filterState.userLat !== undefined && filterState.userLng !== undefined
        ? { lat: filterState.userLat, lng: filterState.userLng }
        : null;
    if (!coords && isNearbyLocationPrompt(message)) {
      setIsRequestingLocation(true);
      try {
        coords = await requestCurrentLocation();
      } finally {
        setIsRequestingLocation(false);
      }
      if (controller.signal.aborted) return;
    }

    let targetPlace: { lat: number; lng: number; name: string } | null = null;
    const placeQuery = extractNearbyPlaceQuery(message);
    if (placeQuery) {
      setIsRequestingLocation(true);
      try {
        const match = await resolveBestPlaceMatch(placeQuery, controller.signal, coords);
        if (match) {
          targetPlace = {
            lat: match.lat,
            lng: match.lng,
            name: match.title || placeQuery,
          };
        }
      } catch (geoErr: unknown) {
        if (geoErr instanceof DOMException && geoErr.name === "AbortError") {
          return;
        }
      } finally {
        setIsRequestingLocation(false);
      }
      if (controller.signal.aborted) return;
    }

    const request: ChatRequest = {
      message,
      history: state.messages
        .slice(-8)
        .map((m) => ({ role: m.role, text: m.text })),
      currentRoomId: selectedRoom ? undefined : currentRoomId,
      selectedRoomId:
        selectedRoom?.maPhongTro ?? state.selectedRoom?.maPhongTro,
      roomIds: state.roomIds,
      criteria: state.criteria,
      userLat: coords?.lat,
      userLng: coords?.lng,
      targetLat: targetPlace?.lat,
      targetLng: targetPlace?.lng,
      targetPlaceName: targetPlace?.name ?? placeQuery ?? undefined,
    };
    try {
      const response = await mutateAsync({
        request,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      useChatStore.getState().addResponse(response);
      if (
        response.action?.type === "OPEN_BOOKING" &&
        response.rooms.some((r) => r.maPhongTro === response.action?.roomId)
      ) {
        openBooking(response.action.roomId);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(
          err instanceof Error
            ? err.message
            : "Chưa thể kết nối trợ lý. Bạn thử lại nhé.",
        );
        setDraft(message);
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        if (!controller.signal.aborted)
          window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  }

  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLauncherPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origLeft: rect.left,
      origTop: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    };
    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleLauncherPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

    state.moved = true;
    suppressClickRef.current = true;
    const bounds = getLauncherBounds(
      window.innerWidth,
      window.innerHeight,
      state.width,
      state.height,
    );
    setDragCoords({
      x: clamp(state.origLeft + dx, bounds.minX, bounds.maxX),
      y: clamp(state.origTop + dy, bounds.minY, bounds.maxY),
    });
  };

  const finishLauncherDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (state.moved) {
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const bounds = getLauncherBounds(vw, vh, state.width, state.height);
      const finalLeft = clamp(state.origLeft + dx, bounds.minX, bounds.maxX);
      const finalTop = clamp(state.origTop + dy, bounds.minY, bounds.maxY);
      const centerX = finalLeft + state.width / 2;
      const side: "left" | "right" = centerX < vw / 2 ? "left" : "right";
      const ySpan = Math.max(1, bounds.maxY - bounds.minY);
      const nextPos: LauncherDockPos = {
        side,
        yRatio: clamp((finalTop - bounds.minY) / ySpan, 0, 1),
      };
      setDockPos(nextPos);
      saveLauncherDockPos(nextPos);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    dragStateRef.current = null;
    setDragCoords(null);
  };

  const latestAssistant = [...chat.messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const contextLabel = currentRoomId
    ? "Đang hỗ trợ phòng bạn đang xem"
    : chat.selectedRoom
      ? `Đang hỏi: ${chat.selectedRoom.tenLoaiPhong || "phòng đã chọn"}`
      : "Tìm phòng theo cách của bạn";

  const approxBtnW = viewport.w >= 640 ? 132 : LAUNCHER_HEIGHT;
  const launcherBounds = getLauncherBounds(viewport.w, viewport.h, approxBtnW, LAUNCHER_HEIGHT);
  const dockedTop = Math.round(
    launcherBounds.minY + dockPos.yRatio * (launcherBounds.maxY - launcherBounds.minY),
  );
  const isDragging = dragCoords !== null;
  const launcherStyle = isDragging
    ? { left: dragCoords.x, top: dragCoords.y }
    : dockPos.side === "left"
      ? { left: launcherBounds.edgeInset, top: dockedTop }
      : { right: launcherBounds.edgeInset, top: dockedTop };

  return (
    <>
      {!chat.isOpen && (
        <button
          ref={launcherRef}
          type="button"
          aria-label="Mở InnAi"
          title="Kéo để di chuyển vị trí, bấm để mở InnAi"
          aria-expanded={false}
          aria-controls="innfinder-chat"
          style={launcherStyle}
          onPointerDown={handleLauncherPointerDown}
          onPointerMove={handleLauncherPointerMove}
          onPointerUp={finishLauncherDrag}
          onPointerCancel={finishLauncherDrag}
          onClick={() => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            chat.setOpen(true);
          }}
          className={`fixed z-[1100] flex h-14 items-center gap-2.5 rounded-full border border-teal-400/40 bg-teal-700 px-4 text-white shadow-xl shadow-teal-950/20 hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 touch-none select-none ${
            isDragging
              ? "cursor-grabbing scale-105 transition-none"
              : "cursor-grab transition-[top,left,right,transform,background-color] duration-200 ease-out"
          }`}
        >
          <span className="relative">
            <MessageCircle className="h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-300 ring-2 ring-teal-700" />
          </span>
          <span className="hidden text-sm font-bold sm:inline">
            InnAi
          </span>
          <Sparkles className="hidden h-4 w-4 text-teal-200 sm:block" />
        </button>
      )}

      {chat.isOpen && (
        <section
          id="innfinder-chat"
          role="dialog"
          aria-modal="false"
          aria-labelledby="innfinder-chat-title"
          className={`fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[1200] flex h-[min(460px,calc(100dvh-170px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 sm:w-[340px] lg:bottom-6 lg:h-[min(500px,calc(100dvh-100px))] ${
            dockPos.side === "left"
              ? "sm:right-auto sm:left-5 lg:left-6"
              : "sm:left-auto sm:right-5 lg:right-6"
          }`}
        >
          <header className="relative shrink-0 overflow-hidden bg-teal-800 px-4 py-3 text-white">
            <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full border-[20px] border-white/5" />
            <div className="relative flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                <Sparkles className="h-4 w-4 text-teal-100" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="innfinder-chat-title" className="text-sm font-bold">
                  InnAi
                </h2>
                <p className="mt-0.5 truncate text-[11px] text-teal-100">
                  {contextLabel}
                </p>
              </div>
              <button
                type="button"
                title="Lịch sử trò chuyện"
                aria-label="Lịch sử trò chuyện"
                aria-pressed={showHistory}
                onClick={() => setShowHistory((prev) => !prev)}
                className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                  showHistory
                    ? "bg-white/20 text-white"
                    : "text-teal-100 hover:bg-white/10"
                }`}
              >
                <History className="h-4 w-4" />
                {chat.sessions.length > 0 && !showHistory && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                )}
              </button>
              <button
                type="button"
                title="Cuộc trò chuyện mới"
                aria-label="Bắt đầu cuộc trò chuyện mới"
                onClick={() => {
                  requestRef.current?.abort();
                  requestRef.current = null;
                  resetMutation();
                  chat.reset();
                  setShowHistory(false);
                  setError(null);
                  setDraft("");
                  setWaitingSeconds(0);
                  inputRef.current?.focus();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-teal-100 hover:bg-white/10 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Thu nhỏ trợ lý"
                onClick={() => {
                  setShowHistory(false);
                  chat.setOpen(false);
                  window.setTimeout(() => launcherRef.current?.focus(), 0);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-teal-100 hover:bg-white/10 cursor-pointer"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="flex items-center gap-1.5 border-b border-slate-100 bg-white px-4 py-1.5 text-[10px] font-medium text-slate-500">
            <Check className="h-3 w-3 text-teal-600" /> Gợi ý từ thông tin phòng
            trên InnFinder
          </div>

          {showHistory ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/80 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 px-1">
                <h3 className="text-xs font-bold text-slate-800">
                  Lịch sử trò chuyện ({chat.sessions.length})
                </h3>
                {chat.sessions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => chat.clearHistory()}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {chat.sessions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center space-y-2">
                  <History className="h-6 w-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    Chưa có cuộc trò chuyện nào được lưu
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Mỗi cuộc trò chuyện với InnAi sẽ tự động được lưu lại tại đây.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowHistory(false)}
                    className="mt-1 inline-flex items-center justify-center rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 cursor-pointer"
                  >
                    Quay lại trò chuyện
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {chat.sessions.map((session) => {
                    const isActive = session.id === chat.activeSessionId;
                    return (
                      <div
                        key={session.id}
                        className={`group flex items-center gap-2 rounded-xl border p-2.5 transition-colors ${
                          isActive
                            ? "border-teal-500 bg-teal-50/70"
                            : "border-slate-200 bg-white hover:border-teal-300"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            requestRef.current?.abort();
                            requestRef.current = null;
                            resetMutation();
                            chat.openSession(session.id);
                            setShowHistory(false);
                            setError(null);
                            setDraft("");
                            setWaitingSeconds(0);
                            window.setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <p className="truncate text-xs font-bold text-slate-900">
                            {session.title}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {session.messages.length} tin nhắn · {formatSessionTime(session.updatedAt)}
                          </p>
                        </button>
                        <button
                          type="button"
                          aria-label={`Xóa cuộc trò chuyện ${session.title}`}
                          title="Xóa cuộc trò chuyện"
                          onClick={() => chat.deleteSession(session.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-slate-50/80 px-3 py-3"
              >
            {chat.messages.length === 0 && (
              <div className="space-y-3">
                <div className="px-1">
                  <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-700">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                    Cùng tìm phòng vừa ý bạn.
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Bạn muốn ở đâu, ngân sách bao nhiêu? Mình giúp tìm phòng và
                    mở trang đặt lịch xem.
                  </p>
                </div>
                <div className="space-y-2">
                  {(currentRoomId
                    ? [
                        "Phòng này có những tiện ích gì?",
                        "Tiền cọc phòng này là bao nhiêu?",
                        "Tôi muốn đặt lịch xem phòng này",
                      ]
                    : STARTERS
                  ).map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => void sendMessage(text)}
                      className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 cursor-pointer"
                    >
                      {text}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div
              role="log"
              aria-label="Nội dung trò chuyện"
              aria-live="polite"
              aria-relevant="additions"
              className="space-y-4"
            >
              {chat.messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user" ? "flex justify-end" : "space-y-2.5"
                  }
                >
                  {message.role === "assistant" && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-teal-700">
                      <Sparkles className="h-3 w-3" /> InnAi
                    </span>
                  )}
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-teal-700 px-4 py-3 text-sm leading-relaxed text-white"
                        : "whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm border border-slate-200/80 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-xs"
                    }
                  >
                    {message.text}
                  </div>
                  {message.rooms?.map((room, index) => (
                    <ChatRoomCard
                      key={room.maPhongTro}
                      room={room}
                      index={index}
                      disabled={isBusy}
                      onAsk={(r) =>
                        void sendMessage(
                          "Cho tôi biết thêm về phòng này và các tiện ích.",
                          r,
                        )
                      }
                      onBook={(r) => openBooking(r.maPhongTro)}
                    />
                  ))}
                  {message.searchMode === "FILTERED" &&
                    !!message.rooms?.length && (
                      <p className="px-1 text-[10px] leading-relaxed text-slate-500">
                        Đang gợi ý theo tiêu chí và từ khóa; xếp hạng ngữ nghĩa
                        tạm chưa sẵn sàng.
                      </p>
                    )}
                </div>
              ))}
            </div>
            {isBusy && (
              <div className="space-y-2 px-1">
                <div
                  role="status"
                  className="flex items-center gap-2 text-xs text-teal-700"
                >
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  {isRequestingLocation
                    ? "Đang xin quyền truy cập vị trí của bạn…"
                    : waitingSeconds >= 12
                      ? "AI đang phản hồi chậm hơn thường lệ…"
                      : "Đang tìm thông tin phù hợp…"}
                </div>
                {isPending && waitingSeconds >= 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      requestRef.current?.abort();
                      requestRef.current = null;
                      resetMutation();
                      setDraft(
                        [...useChatStore.getState().messages]
                          .reverse()
                          .find((m) => m.role === "user")?.text ?? "",
                      );
                      setError(null);
                      inputRef.current?.focus();
                    }}
                    className="text-[11px] font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-800 cursor-pointer"
                  >
                    Dừng chờ và sửa câu hỏi
                  </button>
                )}
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"
              >
                {error}
                <p className="mt-1 text-amber-800">
                  Nội dung đã được giữ trong ô nhập để bạn gửi lại.
                </p>
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-white p-2.5">
            {chat.selectedRoom && !currentRoomId && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-teal-50 px-3 py-1.5 text-[10px] text-teal-800">
                <span className="truncate">
                  Đang hỏi: {chat.selectedRoom.diaChi}
                </span>
                <button
                  type="button"
                  aria-label="Bỏ chọn phòng"
                  onClick={() => chat.selectRoom(null)}
                  className="shrink-0 p-1 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {!!latestAssistant?.suggestions?.length && !isBusy && (
              <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                {latestAssistant.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void sendMessage(s)}
                    className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:border-teal-300 hover:text-teal-700 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(draft);
              }}
              className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100"
            >
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={1500}
                rows={1}
                aria-label="Tin nhắn cho InnAi"
                placeholder="Mô tả phòng bạn đang tìm…"
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void sendMessage(draft);
                  }
                }}
                className="max-h-24 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-base leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 sm:text-sm"
              />
              <button
                type="submit"
                disabled={isBusy || !draft.trim()}
                aria-label="Gửi tin nhắn"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white transition-colors hover:bg-teal-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
            <p className="mt-2 text-center text-[9px] leading-relaxed text-slate-400">
              AI có thể nhầm lẫn. Kiểm tra chi tiết phòng trước khi đặt lịch.
              {draft.length > 1200 ? ` ${draft.length}/1500` : ""}
            </p>
          </footer>
            </>
          )}
        </section>
      )}
    </>
  );
}
