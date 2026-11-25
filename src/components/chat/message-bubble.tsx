"use client";

import { actionLabels } from "@/lib/chat/action-labels";
import type { UiBlock } from "@/lib/conversation/types";
import { DraftCard, type SaveDraftResult } from "./draft-card";
import type { DraftBlock } from "./draft-edit";
import type { ChatMessage } from "./use-chat-stream";



function TicketCard({
  block,
}: {
  block: Extract<UiBlock, { type: "ticket_card" }>;
}) {
  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-gray-900">{block.ticketId}</span>
        {block.slaBreached ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Vencido
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-gray-700">{block.title}</p>
      <p className="text-xs text-gray-500">{block.statusLabel}</p>
    </div>
  );
}

function TicketSelector({
  block,
  onQuickReply,
}: {
  block: Extract<UiBlock, { type: "ticket_selector" }>;
  onQuickReply?: (text: string) => void;
}) {
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm" data-ticket-selector>
      <p className="text-xs font-medium text-gray-600">Seus chamados abertos</p>
      {block.tickets.map((t) => (
        <button
          key={t.ticketId}
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-left hover:bg-gray-50"
          onClick={() => onQuickReply?.(`Detalhes do ${t.ticketId}`)}
        >
          <span>
            <span className="font-medium text-gray-900">{t.ticketId}</span>
            <span className="ml-2 text-gray-600">{t.title}</span>
          </span>
          {t.slaBreached ? (
            <span className="text-xs font-medium text-red-600">Vencido</span>
          ) : (
            <span className="text-xs text-gray-500">{t.statusLabel}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function UiBlocks({
  blocks,
  onConfirmDraft,
  onCancelDraft,
  onSaveDraft,
  onQuickReply,
}: {
  blocks?: UiBlock[];
  onConfirmDraft?: (draftId: string) => Promise<boolean>;
  onCancelDraft?: (draftId: string) => Promise<boolean>;
  onSaveDraft?: (block: DraftBlock, patch: Record<string, string>) => Promise<SaveDraftResult>;
  onQuickReply?: (text: string) => void;
}) {
  if (!blocks?.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {blocks.map((b, i) => {
        if (b.type === "ticket_card") return <TicketCard key={i} block={b} />;
        if (b.type === "ticket_selector") {
          return (
            <TicketSelector key={i} block={b} onQuickReply={onQuickReply} />
          );
        }
        if (b.type === "draft_card") {
          return (
            <DraftCard
              key={i}
              block={b}
              onConfirm={onConfirmDraft}
              onCancel={onCancelDraft}
              onSave={onSaveDraft}
            />
          );
        }
        if (b.type === "kb_chips") {
          return (
            <div key={i} className="flex flex-wrap gap-2">
              {b.articles.map((a) => (
                <span
                  key={a.slug}
                  className="rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-700"
                >
                  {a.title}
                </span>
              ))}
            </div>
          );
        }
        if (b.type === "confidence") {
          return (
            <p key={i} className="text-xs text-gray-500">
              Confiança: {b.value}%
            </p>
          );
        }
        if (b.type === "quick_replies") {
          return null;
        }
        return null;
      })}
    </div>
  );
}

function StatusLineChips({ actions }: { actions: string[] }) {
  if (!actions.length) return null;
  const labels = actionLabels(actions);
  return (
    <div className="mb-2 flex flex-wrap gap-1" data-status-line>
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-800"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function MessageBubble({
  message,
  onQuickReply,
  onConfirmDraft,
  onCancelDraft,
  onSaveDraft,
}: {
  message: ChatMessage;
  onQuickReply?: (text: string) => void;
  onConfirmDraft?: (draftId: string) => Promise<boolean>;
  onCancelDraft?: (draftId: string) => Promise<boolean>;
  onSaveDraft?: (block: DraftBlock, patch: Record<string, string>) => Promise<SaveDraftResult>;
}) {
  if (message.role === "system") {
    return (
      <p className="text-center text-xs text-gray-500" role="status">
        {message.content}
      </p>
    );
  }

  const isUser = message.role === "user";
  const quick =
    message.uiBlocks?.find((b) => b.type === "quick_replies") as
      | Extract<UiBlock, { type: "quick_replies" }>
      | undefined;

  return (
    <div
      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
        isUser
          ? "ml-auto bg-brand-600 text-white"
          : "mr-auto border border-gray-200 bg-white text-gray-800"
      }`}
    >
      {!isUser && message.trace?.actions?.length ? (
        <StatusLineChips actions={message.trace.actions} />
      ) : null}
      <p className="whitespace-pre-wrap">{message.content}</p>
      {!isUser ? (
        <UiBlocks
          blocks={message.uiBlocks}
          onConfirmDraft={onConfirmDraft}
          onCancelDraft={onCancelDraft}
          onSaveDraft={onSaveDraft}
          onQuickReply={onQuickReply}
        />
      ) : null}
      {!isUser && message.trace ? (
        <details className="mt-2 text-xs text-gray-500">
          <summary className="cursor-pointer">Trace</summary>
          <p className="mt-1 text-gray-700">{message.trace.understanding}</p>
          <p>Confiança: {message.trace.confidence}%</p>
          {message.trace.reasoning ? (
            <p className="mt-1" data-trace-reasoning>
              <span className="font-medium text-gray-600">Por quê:</span>{" "}
              {message.trace.reasoning}
            </p>
          ) : null}
          {message.trace.evidence?.length ? (
            <ul className="mt-1 list-inside list-disc">
              {message.trace.evidence.map((e, idx) => (
                <li key={idx}>
                  {e.type}: {e.id}
                  {e.excerpt ? ` — ${e.excerpt.slice(0, 60)}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <p>Tools: {message.trace.actions.join(", ") || "—"}</p>
          <p>Regras: {message.trace.rulesFired.join(", ")}</p>
          <details className="mt-2">
            <summary className="cursor-pointer text-gray-600">Detalhes técnicos</summary>
            <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-100 p-2 text-[10px] text-gray-700">
              {JSON.stringify(message.trace, null, 2)}
            </pre>
          </details>
        </details>
      ) : null}
      {!isUser && quick && onQuickReply ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {quick.options.map((opt) => (
            <button
              key={opt}
              type="button"
              className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
              onClick={() => onQuickReply(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}