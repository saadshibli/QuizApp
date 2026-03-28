"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="space-bg min-h-screen flex items-center justify-center p-4">
      <div className="cartoon-panel max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <span className="text-3xl">😵</span>
        </div>
        <h2 className="text-xl font-black text-white mb-2">
          Oops! Something broke
        </h2>
        <p className="text-purple-300 text-sm mb-6">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="btn-cartoon btn-cartoon-pink px-6 py-2 text-sm"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="btn-cartoon btn-cartoon-outline px-6 py-2 text-sm"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
