export default function Loading() {
  return (
    <div className="space-bg min-h-screen flex items-center justify-center">
      <div
        className="flex flex-col items-center gap-4"
        role="status"
        aria-label="Loading"
      >
        <div className="waiting-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p className="text-purple-300 text-sm font-bold animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
