"use client";

import { Button } from "@/components/ui/button";
import { ResetIcon } from "@/components/ui/icons";
import { useState } from "react";

/**
 * Botão "Redefinir senha" do perfil. Na demo não há envio de e-mail (a autenticação
 * aceita qualquer senha), então o clique só explica isso em vez de simular o envio.
 */
export function PasswordResetButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ResetIcon className="size-4" />
        Redefinir senha
      </Button>
      {open ? (
        <p className="max-w-56 text-right text-xs text-nexo-ink-3" role="status" data-password-reset-notice>
          Demo: o envio do link está desativado. Fale com a TI no ramal 4000.
        </p>
      ) : null}
    </div>
  );
}
