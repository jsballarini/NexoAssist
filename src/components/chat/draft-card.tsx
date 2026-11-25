"use client";

import { Button } from "@/components/ui/button";
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs" data-draft-field={label}>
      <dt className="w-24 shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap text-gray-800">{value}</dd>
    </div>
  );
}

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

/** Card de rascunho: mostra os seis campos em PT-BR e permite edição inline antes de confirmar. */
export function DraftCard({ block, onConfirm, onCancel, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DraftForm>(() => formFromBlock(block));
  const due = new Date(block.dueAtPreview).toLocaleString("pt-BR");

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
      className="mt-2 rounded-lg border border-brand-200 bg-brand-50/50 p-3 text-sm"
      data-draft-card
      data-draft-editing={editing ? "true" : "false"}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-gray-900">{block.draftId}</span>
        <span className="text-xs uppercase text-gray-600">{block.operation}</span>
      </div>

      {editing ? (
        <form
          className="mt-2 space-y-2"
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
        <>
          <p className="mt-1 font-medium text-gray-800">{block.title}</p>
          <dl className="mt-1 space-y-0.5">
            <Row label="Tipo" value={labelOr(ticketTypeLabel, block.ticketType)} />
            <Row label="Categoria" value={labelOr(ticketCategoryLabel, block.category)} />
            <Row label="Descrição" value={block.description?.trim() || "—"} />
            <Row label="Prioridade" value={labelOr(ticketPriorityLabel, block.priority)} />
            <Row label="Afetados" value={labelOr(affectedScopeLabel, block.affectedScope)} />
            <Row label="SLA previsto" value={due} />
          </dl>
        </>
      )}

      {onConfirm && onCancel && !editing ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => void onConfirm(block.draftId)}>
            Confirmar
          </Button>
          {onSave ? (
            <Button type="button" size="sm" variant="outline" onClick={startEdit}>
              Editar
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={() => void onCancel(block.draftId)}>
            Cancelar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
