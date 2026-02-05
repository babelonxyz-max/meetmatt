import { redirect } from "next/navigation";
import Link from "next/link";

// This would normally check auth - simplified for build
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // For now, show dashboard without strict auth check
  // In production, implement proper session validation
  
  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold text-white">
                Meet Matt
              </Link>
              <div className="hidden md:flex gap-4">
                <Link href="/dashboard" className="text-slate-300 hover:text-white">
                  Overview
                </Link>
                <Link href="/pricing" className="text-slate-300 hover:text-white">
                  Pricing
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
