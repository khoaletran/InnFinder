import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageCircle, X } from 'lucide-react';
import {
  directChatService,
  type ChatConversationSummary,
} from '@/services/directChat.service';

interface ChatInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conv: ChatConversationSummary) => void;
}

export const ChatInboxModal: React.FC<ChatInboxModalProps> = ({
  isOpen,
  onClose,
  onSelectConversation,
}) => {
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['chat', 'conversations', 'CUSTOMER'],
    queryFn: () => directChatService.getConversations('CUSTOMER'),
    enabled: isOpen,
    refetchInterval: isOpen ? 5000 : false,
    retry: false,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-4 top-[72px] sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-teal-700" />
          <h3 className="text-sm font-bold text-slate-900">Tin nhắn gần đây</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          aria-label="Đóng hộp thư"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
        {isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
            <span className="text-xs">Đang tải tin nhắn...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="py-10 px-4 text-center space-y-1.5">
            <MessageCircle className="w-7 h-7 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">Chưa có cuộc trò chuyện nào</p>
            <p className="text-[11px] text-slate-500">
              Bạn có thể nhắn tin với Chủ trọ khi lịch hẹn đã xác nhận hoặc nhắn trực tiếp trên bài Ở ghép.
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.channelId}
              type="button"
              onClick={() => {
                onSelectConversation(conv);
                onClose();
              }}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer"
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
                <p className="text-[11px] text-teal-700 font-medium truncate">
                  {conv.partnerRoleLabel} · {conv.title}
                </p>
                <p className="text-xs text-slate-600 truncate mt-0.5">
                  {conv.lastMessage ? (
                    <>
                      {conv.lastSenderName ? `${conv.lastSenderName}: ` : ''}
                      {conv.lastMessage}
                    </>
                  ) : (
                    <span className="text-slate-400 italic">Bấm để bắt đầu trò chuyện</span>
                  )}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
