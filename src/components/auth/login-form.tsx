"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

const FIELD_ICON_CLASS = "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-nexo-ink-3";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Não foi possível entrar. Tente novamente.");
        return;
      }

      const data = (await res.json()) as {
        user: { role: string };
      };

      const dest =
        data.user.role === "analyst" ? "/atendente/conversas" : "/atendimento";
      router.push(dest);
      router.refresh();
    } catch {
      setError("Falha de rede. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-nexo-ink-2">
          E-mail corporativo
        </Label>
        <div className="relative">
          <MailIcon className={FIELD_ICON_CLASS} />
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ana.souza@nexo.com.br"
            className="pl-10"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium text-nexo-ink-2">
            Senha
          </Label>
          <a
            href="tel:4000"
            className="text-sm font-medium text-brand-700 hover:underline"
            title="A senha é a da rede Nexo; a redefinição é feita pela TI (ramal 4000)."
          >
            Esqueci minha senha
          </a>
        </div>
        <div className="relative">
          <LockIcon className={FIELD_ICON_CLASS} />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="px-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-nexo-ink-3 hover:text-nexo-ink"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-nexo-ink-2">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
        />
        Manter conectado neste computador
      </label>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full bg-nexo-cta hover:bg-brand-900" disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
        {loading ? null : <ArrowRightIcon className="size-4" />}
      </Button>
    </form>
  );
}
