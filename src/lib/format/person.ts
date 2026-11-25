/** Iniciais até 2 letras (ex.: "Ana Souza" → "AS"). */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Paleta de avatares do protótipo (fundo suave + texto), escolhida de forma estável pelo nome. */
const AVATAR_TONES = [
  "bg-brand-100 text-brand-800",
  "bg-orange-100 text-orange-800",
  "bg-violet-100 text-violet-800",
  "bg-emerald-100 text-emerald-800",
  "bg-rose-100 text-rose-800",
  "bg-slate-200 text-slate-700",
  "bg-amber-100 text-amber-800",
] as const;

export function avatarToneClass(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}
