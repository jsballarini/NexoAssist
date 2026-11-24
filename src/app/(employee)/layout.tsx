import { EmployeeSidebar } from "@/components/employee/employee-sidebar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.user || session.user.role !== "employee") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <EmployeeSidebar userName={session.user.name} userEmail={session.user.email} />
      <div className="flex min-h-screen flex-1 flex-col">{children}</div>
    </div>
  );
}