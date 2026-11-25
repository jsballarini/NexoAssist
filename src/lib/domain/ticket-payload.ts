import { z } from "zod";

const MIN_TEXT_CHARS = 3;
const MAX_TITLE_CHARS = 120;
const MAX_DESCRIPTION_CHARS = 2000;

/** Os seis campos obrigatórios de todo chamado novo (Anexo A). */
export const CreateTicketPayloadSchema = z.object({
  type: z.enum(["INC", "REQ"]),
  category: z.enum(["acesso", "rede_vpn", "hardware", "software", "email", "outros"]),
  title: z.string().trim().min(MIN_TEXT_CHARS).max(MAX_TITLE_CHARS),
  description: z.string().trim().min(MIN_TEXT_CHARS).max(MAX_DESCRIPTION_CHARS),
  priority: z.enum(["critical", "high", "medium", "low"]),
  affectedScope: z.enum(["only_me", "team", "organization"]),
});

export type CreateTicketPayload = z.infer<typeof CreateTicketPayloadSchema>;

export const REQUIRED_CREATE_FIELDS = [
  "title",
  "description",
  "type",
  "category",
  "priority",
  "affectedScope",
] as const;

export type RequiredCreateField = (typeof REQUIRED_CREATE_FIELDS)[number];

export type CreatePayloadCheck =
  | { ok: true; payload: CreateTicketPayload }
  | { ok: false; missing: RequiredCreateField[]; invalid: RequiredCreateField[] };

/**
 * Valida o payload de um chamado novo. `missing` lista campos ausentes/vazios;
 * `invalid` lista campos presentes com valor fora do contrato.
 */
export function checkCreatePayload(payload: Partial<Record<RequiredCreateField, unknown>>): CreatePayloadCheck {
  const parsed = CreateTicketPayloadSchema.safeParse(payload);
  if (parsed.success) return { ok: true, payload: parsed.data };

  const missing = new Set<RequiredCreateField>();
  const invalid = new Set<RequiredCreateField>();
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as RequiredCreateField;
    const value = payload[field];
    const isBlank = value === undefined || value === null || String(value).trim() === "";
    (isBlank ? missing : invalid).add(field);
  }
  return { ok: false, missing: [...missing], invalid: [...invalid] };
}
