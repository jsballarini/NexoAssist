"use client";

export function LogoutLink() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="text-sm text-brand-600 hover:underline"
    >
      Sair
    </button>
  );
}