"use client";

import { CardField } from "@/components/tickets/card-field";
import { ToneDot, priorityTone } from "@/components/tickets/ticket-tone";
import { Button } from "@/components/ui/button";
import { formatDeadline } from "@/lib/format/date";
import {
  affectedScopeLabel,
  labelOr,
  ticketCategoryLabel,
  ticketPriorityLabel,
  ticketTypeLabel,
} from "@/lib/domain/ticket-labels";
import { useState } from "react";
import {
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  SCOPE_OPTIONS,
  TYPE_OPTIONS,
  buildDraftPatch,
  formFromBlock,
  type DraftBlock,
  type DraftForm,
} from "./draft-edit";

export type SaveDraftResult = { ok: true } | { ok: false; error: string };

type Props = {
  block: DraftBlock;
  onConfirm?: (draftId: string) => Promise<boolean>;
  onCancel?: (draftId: string) => Promise<boolean>;
  /** Presente apenas na sessão ativa; ausente em histórico (somente leitura). */
  onSave?: (block: DraftBlock, patch: Record<string, string>) => Promise<SaveDraftResult>;
};

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-none";

const OPERATION_TITLE: Record<DraftBlock["operation"], string> = {
  create: "Novo chamado",
  update: "Atualização de chamado",
  reopen: "Reabertura de chamado",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-gray-600">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly T[];
  labels: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select className={SELECT_CLASS} value={value} onChange={(e) => onChange(e.target.value)}>
        {!options.includes(value as T) ? <option value={value}>{labelOr(labels, value)}</option> : null}
        {options.map((o) => (
          <option key={o} value={o}>
            {labels[o]}
          </option>
        ))}
      </select>
    </Field>
  );
}

function DraftHeader({ block, actionable }: { block: DraftBlock; actionable: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-3.5 text-xs text-nexo-ink-3">
      <span className="flex min-w-0 items-center gap-1.5">
        <span>{OPERATION_TITLE[block.operation]}</span>
        <span aria-hidden>·</span>
        <span data-draft-field="Tipo">{labelOr(ticketTypeLabel, block.ticketType)}</span>
        <span aria-hidden>·</span>
        <span>Rascunho {block.draftId}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 font-medium text-nexo-warning-text">
        <ToneDot tone={actionable ? "warning" : "neutral"} />
        {actionable ? "Aguardando confirmação" : "Rascunho"}
      </span>
    </div>
  );
}

/** Modo leitura do rascunho (Tela 1): título, descrição e grade Categoria/Prioridade/Afetados. */
function DraftSummaryView({ block }: { block: DraftBlock }) {
  return (
    <div className="px-4 pb-4">
      <p className="mt-2 font-newsreader text-xl leading-snug font-medium text-nexo-ink">{block.title}</p>
      <p className="mt-1.5 text-sm whitespace-pre-wrap text-nexo-ink-2" data-draft-field="Descrição">
        {block.description?.trim() || "—"}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-nexo-rule pt-3">
        <CardField label="Categoria" field="Categoria">
          {labelOr(ticketCategoryLabel, block.category)}
        </CardField>
        <CardField label="Prioridade" field="Prioridade">
          <ToneDot tone={priorityTone(block.priority)} />
          {labelOr(ticketPriorityLabel, block.priority)}
          <span className="text-xs font-normal text-nexo-ink-3" data-draft-field="SLA previsto">
            · resposta até {formatDeadline(block.dueAtPreview)}
          </span>
        </CardField>
        <CardField label="Afetados" field="Afetados">
          {labelOr(affectedScopeLabel, block.affectedScope)}
        </CardField>
      </dl>
    </div>
  );
}

/** Card de rascunho: mostra os seis campos em PT-BR e permite edição inline antes de confirmar. */
export function DraftCard({ block, onConfirm, onCancel, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DraftForm>(() => formFromBlock(block));
  const actionable = Boolean(onConfirm && onCancel);

  function set<K extends keyof DraftForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit() {
    setForm(formFromBlock(block));
    setError(null);
    setEditing(true);
  }

  async function save() {
    if (!onSave) return;
    const patch = buildDraftPatch(block, form);
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSave(block, patch);
    setSaving(false);
    if (result.ok) setEditing(false);
    else setError(result.error);
  }

  return (
    <div
      className="overflow-hidden rounded-nexo-lg border border-nexo-rule bg-white text-sm shadow-theme-xs"
      data-draft-card
      data-draft-editing={editing ? "true" : "false"}
    >
      <DraftHeader block={block} actionable={actionable} />
      {editing ? (
        <form
          className="space-y-2 px-4 pt-3 pb-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <SelectField
              label="Tipo"
              value={form.ticketType}
              options={TYPE_OPTIONS}
              labels={ticketTypeLabel}
              onChange={(v) => set("ticketType", v)}
            />
            <SelectField
              label="Categoria"
              value={form.category}
              options={CATEGORY_OPTIONS}
              labels={ticketCategoryLabel}
              onChange={(v) => set("category", v)}
            />
          </div>
          <Field label="Título">
            <input
              className={SELECT_CLASS}
              value={form.title}
              maxLength={120}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>
          <Field label="Descrição">
            <textarea
              className="min-h-20 w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-none"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <SelectField
              label="Prioridade"
              value={form.priority}
              options={PRIORITY_OPTIONS}
              labels={ticketPriorityLabel}
              onChange={(v) => set("priority", v)}
            />
            <SelectField
              label="Afetados"
              value={form.affectedScope}
              options={SCOPE_OPTIONS}
              labels={affectedScopeLabel}
              onChange={(v) => set("affectedScope", v)}
            />
          </div>
          {error ? (
            <p className="text-xs text-red-700" role="alert" data-draft-error>
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving} aria-busy={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Descartar edição
            </Button>
          </div>
        </form>
      ) : (
        <DraftSummaryView block={block} />
      )}

      {actionable && onConfirm && onCancel && !editing ? (
        <div className="flex flex-wrap gap-2 border-t border-nexo-rule bg-nexo-desk px-4 py-2.5">
          <Button
            type="button"
            size="sm"
            className="bg-nexo-cta hover:bg-brand-900"
            onClick={() => void onConfirm(block.draftId)}
          >
            Confirmar
          </Button>
          {onSave ? (
            <Button type="button" size="sm" variant="outline" className="bg-white" onClick={startEdit}>
              Editar
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" onClick={() => void onCancel(block.draftId)}>
            Cancelar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
