export default function Loading() {
  return (
    <div className="h-screen w-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-[var(--muted)] font-mono animate-pulse">
        INITIALIZING SYSTEM...
      </div>
    </div>
  );
}
