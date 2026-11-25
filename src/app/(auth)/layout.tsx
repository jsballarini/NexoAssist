import { LoginShowcase } from "@/components/auth/login-showcase";
import {
  getLoginPreviewTicket,
  getLoginShowcaseStats,
} from "@/lib/public/login-showcase-stats";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [stats, ticket] = await Promise.all([getLoginShowcaseStats(), getLoginPreviewTicket()]);

  return (
    <div className="flex min-h-screen w-full bg-white font-login">
      <LoginShowcase stats={stats} ticket={ticket} />
      {children}
    </div>
  );
}