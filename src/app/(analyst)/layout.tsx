import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AnalystLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.user || session.user.role !== "analyst") {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">{children}</div>
  );
}