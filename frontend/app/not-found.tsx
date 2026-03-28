import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-bg min-h-screen flex items-center justify-center p-4">
      <div className="cartoon-panel max-w-md w-full p-8 text-center">
        <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 mb-2">
          404
        </div>
        <h2 className="text-xl font-black text-white mb-2">Page Not Found</h2>
        <p className="text-purple-300 text-sm mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="btn-cartoon btn-cartoon-pink px-6 py-2 text-sm inline-block"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
