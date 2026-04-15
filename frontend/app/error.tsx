"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="ox-glass-16 ox-glass-edge rounded-2xl p-8 max-w-md text-center">
        <div className="text-4xl mb-3 text-ox-danger">!</div>
        <h2 className="text-lg font-display font-semibold text-ox-text-primary mb-2">Something went wrong</h2>
        <p className="text-sm text-ox-text-muted mb-4">{error.message || "An unexpected error occurred."}</p>
        <button onClick={reset} className="ox-btn-primary px-5 py-2 text-sm">
          Try Again
        </button>
      </div>
    </div>
  );
}
