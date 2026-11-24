"use client";

import { cn } from "@/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type EmployeeSidebarProps = {
  userName: string;
  userEmail: string;
};

const nav = [
  { href: "/atendimento", label: "Atendimento" },
  { href: "/perfil", label: "Meu perfil" },
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
    <aside className="flex h-screen w-[232px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-6">
        <p className="text-lg font-semibold text-gray-900">Nexo</p>
        <p className="text-xs text-gray-500">Service desk</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-gray-100 p-4">
        <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
        <p className="truncate text-xs text-gray-500">{userEmail}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}