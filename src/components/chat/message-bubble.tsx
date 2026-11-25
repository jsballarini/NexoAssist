"use client";

import { CheckIcon } from "@/components/ui/icons";
import { actionLabels } from "@/lib/chat/action-labels";
import type { UiBlock } from "@/lib/conversation/types";
import { DraftCard, type SaveDraftResult } from "./draft-card";
import type { DraftBlock } from "./draft-edit";
import { MessageContent } from "./message-content";
import { TicketCard, TicketSelector } from "./ticket-blocks";
import { TraceDetails } from "./trace-details";
import type { ChatMessage } from "./use-chat-stream";

type DraftHandlers = {
  onConfirmDraft?: (draftId: string) => Promise<boolean>;
  onCancelDraft?: (draftId: string) => Promise<boolean>;
  onSaveDraft?: (block: DraftBlock, patch: Record<string, string>) => Promise<SaveDraftResult>;
};

const ASSISTANT_NAME = "Nexo Assist";

/** Blocos ricos (cards) exibidos abaixo do texto, na largura da coluna. */
function CardBlocks({
  blocks,
  onQuickReply,
  ...draft
}: DraftHandlers & { blocks: UiBlock[]; onQuickReply?: (text: string) => void }) {
  if (!blocks.length) return null;
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        if (b.type === "ticket_card") return <TicketCard key={i} block={b} />;
        if (b.type === "ticket_selector") {
          return <TicketSelector key={i} block={b} onQuickReply={onQuickReply} />;
        }
        if (b.type === "draft_card") {
          return (
            <DraftCard
              key={i}
              block={b}
              onConfirm={draft.onConfirmDraft}
              onCancel={draft.onCancelDraft}
              onSave={draft.onSaveDraft}
            />
          );
        }
        if (b.type === "kb_chips") {
          return (
            <div key={i} className="flex flex-wrap gap-1.5">
              {b.articles.map((a) => (
                <span
                  key={a.slug}
                  className="rounded-nexo-sm border border-brand-100 bg-brand-50 px-2 py-1 text-xs text-brand-700"
                >
                  {a.title}
                </span>
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

/** Linha "Nexo Assist ✓ consultou seus chamados ✓ …" acima da resposta (G-UI-E01). */
function StatusLine({ actions }: { actions: string[] }) {
  const labels = actionLabels(actions);
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs" data-status-line>
      <span className="font-semibold text-nexo-ink">{ASSISTANT_NAME}</span>
      {labels.map((label) => (
        <span key={label} className="inline-flex items-center gap-1 text-nexo-ink-3">
          <CheckIcon className="size-3" />
          {label}
        </span>
      ))}
    </div>
  );
}

function QuickReplies({ options, onPick }: { options: string[]; onPick: (text: string) => void }) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className="rounded-nexo-sm border border-nexo-rule bg-white px-2.5 py-1 text-xs font-medium text-nexo-ink hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          onClick={() => onPick(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SystemLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 py-1 text-xs text-nexo-ink-3" role="status">
      <span className="h-px flex-1 bg-nexo-rule" />
      <span className="max-w-[80%] text-center">{text}</span>
      <span className="h-px flex-1 bg-nexo-rule" />
    </div>
  );
}

/** Uma mensagem do chat do funcionário no estilo do protótipo (Telas 1 e 2). */
export function MessageBubble({
  message,
  onQuickReply,
  ...draft
}: DraftHandlers & {
  message: ChatMessage;
  onQuickReply?: (text: string) => void;
}) {
  if (message.role === "system") return <SystemLine text={message.content} />;

  if (message.role === "user") {
    return (
      <div
        className="ml-auto max-w-[75%] rounded-nexo-md bg-nexo-ink px-3.5 py-2.5 text-sm text-white"
        data-message-role="user"
      >
        <MessageContent text={message.content} className="whitespace-pre-wrap" />
      </div>
    );
  }

  if (message.role === "analyst") {
    return (
      <div className="mr-auto max-w-[75%] space-y-1" data-message-role="analyst">
        <p className="text-xs font-semibold text-nexo-success-text" data-analyst-label>
          {message.authorName ?? "Analista"}
        </p>
        <div className="rounded-nexo-md border border-nexo-success/25 bg-nexo-success-soft px-3.5 py-2.5 text-sm text-nexo-ink">
          <MessageContent text={message.content} className="whitespace-pre-wrap" />
        </div>
      </div>
    );
  }

  const blocks = message.uiBlocks ?? [];
  const quick = blocks.find((b) => b.type === "quick_replies");
  return (
    <div className="mr-auto w-full space-y-1.5" data-message-role="assistant">
      <StatusLine actions={message.trace?.actions ?? []} />
      {message.content.trim() || quick ? (
        <div className="max-w-[75%] rounded-nexo-md border border-nexo-rule bg-white px-3.5 py-2.5 text-sm text-nexo-ink">
          <MessageContent text={message.content} className="whitespace-pre-wrap" />
          {quick && onQuickReply ? <QuickReplies options={quick.options} onPick={onQuickReply} /> : null}
        </div>
      ) : null}
      <CardBlocks blocks={blocks} onQuickReply={onQuickReply} {...draft} />
      {message.trace ? <TraceDetails trace={message.trace} /> : null}
    </div>
  );
}
