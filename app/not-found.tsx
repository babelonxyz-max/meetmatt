import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#0ea5e9] font-mono mb-4">404</h1>
        <p className="text-[var(--muted)] mb-6">MODULE NOT FOUND</p>
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] hover:border-[#0ea5e9] text-[var(--foreground)] hover:text-[#0ea5e9] transition-colors text-sm font-mono"
        >
          RETURN TO SYSTEM
        </Link>
      </div>
    </div>
  );
}
