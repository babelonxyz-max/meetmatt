import { auth } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <DashboardNav user={session.user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

function DashboardNav({ user }: { user: any }) {
  return (
    <nav className="border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <a href="/" className="text-xl font-bold">
              Meet Matt
            </a>
            <div className="hidden md:flex gap-4">
              <a href="/dashboard" className="text-slate-300 hover:text-white">
                Overview
              </a>
              <a href="/dashboard/agents" className="text-slate-300 hover:text-white">
                My Agents
              </a>
              <a href="/dashboard/billing" className="text-slate-300 hover:text-white">
                Billing
              </a>
              <a href="/dashboard/affiliate" className="text-slate-300 hover:text-white">
                Affiliate
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm hidden sm:block">
              {user.email}
            </span>
            <a
              href="/api/auth/signout"
              className="text-sm text-slate-400 hover:text-white"
            >
              Sign out
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
