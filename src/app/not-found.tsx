import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
        <span className="text-3xl font-extrabold text-amber-500">404</span>
      </div>
      <h1 className="text-3xl font-bold text-slate-50 mb-2">Page Not Found</h1>
      <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
        The page or resource you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-all shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95"
      >
        Return to Dashboard
      </Link>
    </main>
  );
}
