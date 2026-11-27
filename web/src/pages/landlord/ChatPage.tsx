import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@heroui/react';
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Loader2, MessageCircle, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  appendOptimisticChatMessage,
  directChatService,
  reconcileSavedChatMessage,
  type ChatConversationSummary,
  type ChatMessage,
  type ChatThread,
} from '@/services/directChat.service';
import { useAuthStore } from '@/store/useAuthStore';

export const LandlordChatPage: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.maNguoiDung;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<ChatConversationSummary | null>(null);
  const [draft, setDraft] = useState('');
  const listEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevScrollRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const lastNewestMsgIdRef = useRef<string | null>(null);

  const conversationsQuery = useInfiniteQuery({
    queryKey: ['chat', 'conversations', 'LANDLORD'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => directChatService.getConversations('LANDLORD', 10, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    refetchInterval: 15000,
    retry: false,
  });

  const conversations = useMemo(() => {
    const pages = conversationsQuery.data?.pages ?? [];
    const seen = new Set<string>();
    const list: ChatConversationSummary[] = [];
    for (const page of pages) {
      for (const item of page.items) {
        if (!seen.has(item.channelId)) {
          seen.add(item.channelId);
          list.push(item);
        }
      }
    }
    return list;
  }, [conversationsQuery.data]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      [c.partnerName, c.title, c.lastMessage ?? ''].join(' ').toLowerCase().includes(q),
    );
  }, [conversations, search]);

  const activeConversation = useMemo(() => {
    if (selectedChannel) {
      return (
        conversations.find((c) => c.channelId === selectedChannel.channelId) ??
        selectedChannel
      );
    }
    return filteredConversations[0] ?? null;
  }, [selectedChannel, conversations, filteredConversations]);

  const threadQuery = useInfiniteQuery({
    queryKey: ['chat', activeConversation?.contextType, activeConversation?.contextId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      directChatService.getThread(
        activeConversation!.contextType,
        activeConversation!.contextId,
        10,
        pageParam,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    enabled: Boolean(activeConversation),
    refetchInterval: activeConversation ? 15000 : false,
    retry: false,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      directChatService.sendMessage(
        activeConversation!.contextType,
        activeConversation!.contextId,
        content,
      ),
    onMutate: async (content: string) => {
      const target = activeConversation!;
      await queryClient.cancelQueries({
        queryKey: ['chat', target.contextType, target.contextId],
      });
      const tempId = `temp-${Date.now()}`;
      const previous = appendOptimisticChatMessage(
        queryClient,
        target.contextType,
        target.contextId,
        {
          id: tempId,
          senderId: currentUserId || '',
          senderName: currentUser?.hoVaTen || currentUser?.tenDangNhap || 'Bạn',
          senderAvatar: currentUser?.hinhDaiDien || null,
          content,
          createdAt: new Date().toISOString(),
        },
      );
      setDraft('');
      return { previous, tempId, content, target };
    },
    onSuccess: (saved, _content, ctx) => {
      if (ctx?.tempId && ctx.target) {
        reconcileSavedChatMessage(
          queryClient,
          ctx.target.contextType,
          ctx.target.contextId,
          saved,
          ctx.tempId,
        );
      }
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', 'LANDLORD'] });
    },
    onError: (err: Error, _content, ctx) => {
      if (ctx?.previous && ctx.target) {
        queryClient.setQueryData<InfiniteData<ChatThread>>(
          ['chat', ctx.target.contextType, ctx.target.contextId],
          ctx.previous,
        );
      }
      if (ctx?.content) {
        setDraft((prev) => prev || ctx.content);
      }
      toast.error(err.message || 'Không thể gửi tin nhắn');
    },
  });

  const messages = useMemo(() => {
    const pages = threadQuery.data?.pages ?? [];
    const orderedPages = [...pages].reverse();
    const seen = new Set<string>();
    const list: ChatMessage[] = [];
    for (const page of orderedPages) {
      for (const m of page.messages) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          list.push(m);
        }
      }
    }
    return list;
  }, [threadQuery.data]);

  const newestMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

  useEffect(() => {
    lastNewestMsgIdRef.current = null;
    prevScrollRef.current = null;
  }, [activeConversation?.channelId]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (prevScrollRef.current && el) {
      el.scrollTop = el.scrollHeight - prevScrollRef.current.scrollHeight + prevScrollRef.current.scrollTop;
      prevScrollRef.current = null;
      return;
    }
    if (newestMessageId && newestMessageId !== lastNewestMsgIdRef.current) {
      lastNewestMsgIdRef.current = newestMessageId;
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, newestMessageId, activeConversation?.channelId]);

  const handleConversationsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (
      el.scrollHeight - el.scrollTop - el.clientHeight < 60 &&
      conversationsQuery.hasNextPage &&
      !conversationsQuery.isFetchingNextPage
    ) {
      void conversationsQuery.fetchNextPage();
    }
  };

  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop <= 40 && threadQuery.hasNextPage && !threadQuery.isFetchingNextPage) {
      prevScrollRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
      void threadQuery.fetchNextPage();
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !activeConversation || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  return (
    <Card className="bg-surface rounded-xl border border-border overflow-hidden p-0 h-[calc(100vh-140px)] min-h-[540px] flex flex-col lg:flex-row">
      {/* Cột trái: Danh sách cuộc trò chuyện */}
      <div className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col bg-white shrink-0">
        <div className="p-3.5 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm khách thuê, phòng trọ..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-subtle border border-border text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-accent"
            />
          </div>
        </div>

        <div
          onScroll={handleConversationsScroll}
          className="flex-1 overflow-y-auto divide-y divide-slate-100"
        >
          {conversationsQuery.isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
              <span className="text-xs">Đang tải cuộc trò chuyện...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-12 px-5 text-center space-y-1.5">
              <MessageCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">Chưa có cuộc trò chuyện</p>
              <p className="text-[11px] text-slate-500">
                Các lịch hẹn đã xác nhận trở lên sẽ tự động mở kênh nhắn tin với khách tại đây.
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = activeConversation?.channelId === conv.channelId;
              return (
                <button
                  key={conv.channelId}
                  type="button"
                  onClick={() => setSelectedChannel(conv)}
                  className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-teal-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                    {conv.partnerAvatar ? (
                      <img
                        src={conv.partnerAvatar}
                        alt={conv.partnerName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      conv.partnerName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {conv.partnerName}
                      </span>
                      {conv.updatedAt && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(conv.updatedAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-teal-700 font-medium truncate mt-0.5">
                      {conv.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {conv.lastMessage || 'Bấm để bắt đầu nhắn tin'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
          {conversationsQuery.isFetchingNextPage && (
            <div className="py-3 flex items-center justify-center gap-1.5 text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
              <span className="text-[11px]">Đang tải thêm cuộc trò chuyện...</span>
            </div>
          )}
        </div>
      </div>

      {/* Cột phải: Khung trò chuyện */}
      <div className="flex-1 flex flex-col bg-slate-50/60 min-w-0">
        {!activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <MessageCircle className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Chọn một cuộc trò chuyện</p>
            <p className="text-xs text-slate-500 mt-1">
              Trao đổi nhanh với khách thuê về lịch xem phòng, vị trí và thời gian hẹn.
            </p>
          </div>
        ) : (
          <>
            <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                {activeConversation.partnerAvatar ? (
                  <img
                    src={activeConversation.partnerAvatar}
                    alt={activeConversation.partnerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  activeConversation.partnerName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {activeConversation.partnerName}
                </h3>
                <p className="text-[11px] text-slate-500 truncate">
                  {activeConversation.title}
                </p>
              </div>
            </div>

            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3"
            >
              {threadQuery.isFetchingNextPage && (
                <div className="py-1.5 flex items-center justify-center gap-1.5 text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  <span className="text-[11px]">Đang tải tin nhắn cũ hơn...</span>
                </div>
              )}
              {threadQuery.isPending ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                  <p className="text-xs font-semibold text-slate-600">Chưa có tin nhắn nào</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Gửi lời chào hoặc xác nhận chỉ đường cho khách thuê tại đây.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                          isMine
                            ? 'bg-teal-700 text-white rounded-br-sm'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={listEndRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2.5"
            >
              <input
                type="text"
                maxLength={1000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Nhập tin nhắn gửi khách..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sendMutation.isPending}
                className="h-9 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Gửi</span>
              </button>
            </form>
          </>
        )}
      </div>
    </Card>
  );
};
