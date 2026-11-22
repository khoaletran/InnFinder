import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { chatService } from "@/services/chat.service";
import { ROOM_CHAT_REFERENCE_PATTERN } from "@/constants/ai";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import type { ChatRequest } from "@/types/chat.types";
import type { RoomSummaryResponse } from "@/types/room.types";
import { ChatRoomCard } from "./ChatRoomCard";

const STARTERS = [
  "Phòng dưới 3 triệu ở Gò Vấp",
  "Phòng cho 2 người, có máy lạnh",
  "Cọc xem phòng được hoàn thế nào?",
];

export function RoomChatbot() {
  const chat = useChatStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
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

  useEffect(() => {
    if (chat.isOpen)
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
  }, [chat.messages, chat.isOpen, isPending, error]);

  function openBooking(roomId: string) {
    if (!ROOM_CHAT_REFERENCE_PATTERN.test(roomId)) return;
    const path = `/appointments/schedule/${roomId}`;
    useChatStore.getState().setOpen(false);
    if (!useAuthStore.getState().isAuthenticated) {
      navigate("/login", { state: { from: { pathname: path } } });
    } else navigate(path);
  }

  async function sendMessage(text: string, selectedRoom?: RoomSummaryResponse) {
    const message = text.trim();
    if (!message || message.length > 1500 || isPending) return;
    const state = useChatStore.getState();
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
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
    };
    if (selectedRoom) state.selectRoom(selectedRoom);
    state.addUser(message);
    setDraft("");
    setError(null);
    setWaitingSeconds(0);
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

  const latestAssistant = [...chat.messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const contextLabel = currentRoomId
    ? "Đang hỗ trợ phòng bạn đang xem"
    : chat.selectedRoom
      ? `Đang hỏi: ${chat.selectedRoom.tenLoaiPhong || "phòng đã chọn"}`
      : "Tìm phòng theo cách của bạn";

  return (
    <>
      {!chat.isOpen && (
        <button
          ref={launcherRef}
          type="button"
          aria-label="Mở InnAi"
          aria-expanded={false}
          aria-controls="innfinder-chat"
          onClick={() => chat.setOpen(true)}
          className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 flex h-14 items-center gap-2.5 rounded-full border border-teal-400/40 bg-teal-700 px-4 text-white shadow-xl shadow-teal-950/20 transition-all hover:-translate-y-0.5 hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 lg:right-6 lg:bottom-6 cursor-pointer"
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
          className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 flex h-[min(460px,calc(100dvh-170px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 sm:left-auto sm:right-5 sm:w-[340px] lg:right-6 lg:bottom-6 lg:h-[min(500px,calc(100dvh-100px))]"
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
                title="Cuộc trò chuyện mới"
                aria-label="Bắt đầu cuộc trò chuyện mới"
                onClick={() => {
                  requestRef.current?.abort();
                  requestRef.current = null;
                  resetMutation();
                  chat.reset();
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
                      disabled={isPending}
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
            {isPending && (
              <div className="space-y-2 px-1">
                <div
                  role="status"
                  className="flex items-center gap-2 text-xs text-teal-700"
                >
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  {waitingSeconds >= 12
                    ? "AI đang phản hồi chậm hơn thường lệ…"
                    : "Đang tìm thông tin phù hợp…"}
                </div>
                {waitingSeconds >= 5 && (
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
            {!!latestAssistant?.suggestions?.length && !isPending && (
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
                disabled={isPending || !draft.trim()}
                aria-label="Gửi tin nhắn"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white transition-colors hover:bg-teal-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                {isPending ? (
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
        </section>
      )}
    </>
  );
}
