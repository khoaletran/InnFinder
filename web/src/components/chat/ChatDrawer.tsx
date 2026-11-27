import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageCircle, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { directChatService, type ChatChannelType } from '@/services/directChat.service';
import { useAuthStore } from '@/store/useAuthStore';

interface ChatDrawerProps {
  open: boolean;
  channelType: ChatChannelType;
  contextId: string;
  onClose: () => void;
  fallbackTitle?: string;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  open,
  channelType,
  contextId,
  onClose,
  fallbackTitle,
}) => {
  const currentUserId = useAuthStore((s) => s.user?.maNguoiDung);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const listEndRef = useRef<HTMLDivElement>(null);

  const threadQuery = useQuery({
    queryKey: ['chat', channelType, contextId],
    queryFn: () => directChatService.getThread(channelType, contextId),
    enabled: open && Boolean(contextId),
    refetchInterval: open ? 3000 : false,
    retry: false,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => directChatService.sendMessage(channelType, contextId, content),
    onSuccess: async () => {
      setDraft('');
      await queryClient.invalidateQueries({ queryKey: ['chat', channelType, contextId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Không thể gửi tin nhắn');
    },
  });

  const messages = threadQuery.data?.messages ?? [];

  useEffect(() => {
    if (open) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages.length]);

  if (!open) return null;

  const thread = threadQuery.data;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
              {thread?.partnerAvatar ? (
                <img
                  src={thread.partnerAvatar}
                  alt={thread.partnerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                (thread?.partnerName || 'C').charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {thread?.partnerName || 'Đang kết nối...'}
                </h3>
                {thread?.partnerRoleLabel && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold shrink-0">
                    {thread.partnerRoleLabel}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {thread?.title || fallbackTitle || 'Trao đổi trực tiếp'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng khung chat"
            className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/70">
          {threadQuery.isPending ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
              <span className="text-xs">Đang tải cuộc trò chuyện...</span>
            </div>
          ) : threadQuery.error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
              {threadQuery.error.message || 'Không thể mở cuộc trò chuyện này.'}
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-2 text-slate-400">
              <MessageCircle className="w-8 h-8 text-teal-600/60" />
              <p className="text-xs font-semibold text-slate-700">Chưa có tin nhắn nào</p>
              <p className="text-[11px] text-slate-500">
                Gửi tin nhắn đầu tiên để trao đổi trực tiếp nhanh chóng.
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
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
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

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
        >
          <input
            type="text"
            maxLength={1000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nhập tin nhắn..."
            disabled={Boolean(threadQuery.error)}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sendMutation.isPending || Boolean(threadQuery.error)}
            className="h-9 px-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Gửi</span>
          </button>
        </form>
      </div>
    </div>
  );
};
