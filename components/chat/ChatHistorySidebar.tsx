"use client";

export type ChatHistoryItem = {
  id: string;
  title: string;
  updatedAt?: string;
};

type ChatHistorySidebarProps = {
  conversations?: ChatHistoryItem[];
  activeConversationId?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
  onNewChat?: () => void;
  onSelectConversation?: (conversationId: string) => void;
};

export default function ChatHistorySidebar({
  conversations = [],
  activeConversationId = null,
  isOpen = true,
  onClose,
  onNewChat,
  onSelectConversation,
}: ChatHistorySidebarProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/10 bg-[#080d1d]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
            ALQEV
          </p>

          <h2 className="mt-1 text-lg font-semibold text-white">
            Sohbet geçmişi
          </h2>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            aria-label="Sohbet geçmişini kapat"
          >
            ✕
          </button>
        )}
      </div>

      <div className="p-4">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          + Yeni sohbet
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {conversations.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-slate-300">
              Henüz kayıtlı sohbet yok.
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Yeni bir sohbet başladığında geçmişiniz burada görünecek.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const isActive =
                conversation.id === activeConversationId;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() =>
                    onSelectConversation?.(conversation.id)
                  }
                  className={[
                    "w-full rounded-2xl border px-4 py-3 text-left transition",
                    isActive
                      ? "border-violet-400/40 bg-violet-500/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]",
                  ].join(" ")}
                >
                  <p className="truncate text-sm font-medium text-white">
                    {conversation.title || "Yeni sohbet"}
                  </p>

                  {conversation.updatedAt && (
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {conversation.updatedAt}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <p className="text-xs leading-5 text-slate-500">
          Sohbetler hesabınıza bağlı olarak saklanacaktır.
        </p>
      </div>
    </aside>
  );
}