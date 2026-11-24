"use client";

import { Button } from "@/components/ui/button";
import type { UiBlock } from "@/lib/conversation/types";
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

function DraftCard({
  block,
  onConfirm,
  onCancel,
}: {
  block: Extract<UiBlock, { type: "draft_card" }>;
  onConfirm?: (draftId: string) => Promise<boolean>;
  onCancel?: (draftId: string) => Promise<boolean>;
}) {
  const due = new Date(block.dueAtPreview).toLocaleString("pt-BR");
  return (
    <div className="mt-2 rounded-lg border border-brand-200 bg-brand-50/50 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-gray-900">{block.draftId}</span>
        <span className="text-xs uppercase text-gray-600">{block.operation}</span>
      </div>
      <p className="mt-1 font-medium text-gray-800">{block.title}</p>
      <p className="text-xs text-gray-600">
        Prioridade: {block.priority} · SLA previsto: {due}
      </p>
      {block.affectedScope ? (
        <p className="text-xs text-gray-500">Afetados: {block.affectedScope}</p>
      ) : null}
      {onConfirm && onCancel ? (
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void onConfirm(block.draftId)}
          >
            Confirmar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void onCancel(block.draftId)}
          >
            Cancelar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function UiBlocks({
  blocks,
  onConfirmDraft,
  onCancelDraft,
}: {
  blocks?: UiBlock[];
  onConfirmDraft?: (draftId: string) => Promise<boolean>;
  onCancelDraft?: (draftId: string) => Promise<boolean>;
}) {
  if (!blocks?.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {blocks.map((b, i) => {
        if (b.type === "ticket_card") return <TicketCard key={i} block={b} />;
        if (b.type === "draft_card") {
          return (
            <DraftCard
              key={i}
              block={b}
              onConfirm={onConfirmDraft}
              onCancel={onCancelDraft}
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

export function MessageBubble({
  message,
  onQuickReply,
  onConfirmDraft,
  onCancelDraft,
}: {
  message: ChatMessage;
  onQuickReply?: (text: string) => void;
  onConfirmDraft?: (draftId: string) => Promise<boolean>;
  onCancelDraft?: (draftId: string) => Promise<boolean>;
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
      <p className="whitespace-pre-wrap">{message.content}</p>
      {!isUser ? (
        <UiBlocks
          blocks={message.uiBlocks}
          onConfirmDraft={onConfirmDraft}
          onCancelDraft={onCancelDraft}
        />
      ) : null}
      {!isUser && message.trace ? (
        <details className="mt-2 text-xs text-gray-500">
          <summary className="cursor-pointer">Trace</summary>
          <p className="mt-1">{message.trace.understanding}</p>
          <p>Tools: {message.trace.actions.join(", ") || "—"}</p>
          <p>Regras: {message.trace.rulesFired.join(", ")}</p>
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