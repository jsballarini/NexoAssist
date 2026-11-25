"use client";

import { ChatIcon, LogoutIcon, NexoMark, UserIcon } from "@/components/ui/icons";
import { initialsFromName } from "@/lib/format/person";
import { cn } from "@/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type EmployeeSidebarProps = {
  userName: string;
  userEmail: string;
};

const nav = [
  { href: "/atendimento", label: "Atendimento", Icon: ChatIcon },
  { href: "/perfil", label: "Meu perfil", Icon: UserIcon },
];

export function EmployeeSidebar({ userName, userEmail }: EmployeeSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-[232px] shrink-0 flex-col border-r border-nexo-rule bg-white">
      <p className="flex items-center gap-2 px-5 pb-6 pt-5 text-base font-semibold text-nexo-ink">
        <NexoMark className="size-5 text-brand-500" />
        Nexo Assist
      </p>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-nexo-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-nexo-ink-2 hover:bg-nexo-desk hover:text-nexo-ink",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mx-3 border-t border-nexo-rule px-2 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800">
            {initialsFromName(userName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-nexo-ink">{userName}</span>
            <span className="block truncate text-xs text-nexo-ink-3">{userEmail}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex items-center gap-2 rounded-nexo-sm px-1 py-1 text-sm text-nexo-ink-2 hover:text-nexo-ink"
        >
          <LogoutIcon className="size-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
