export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-ox-border border-t-ox-cyan rounded-full animate-spin" />
        <span className="text-sm text-ox-text-muted">Loading...</span>
      </div>
    </div>
  );
}
