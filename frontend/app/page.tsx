import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-5xl font-bold text-white mb-4">Omnispect-X</h1>
      <p className="text-xl text-slate-400 mb-8 max-w-xl">
        Trust Scores + Decision Lineage for Every AI Agent on X Layer
      </p>
      <div className="flex gap-4">
        <Link href="/trust" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
          Score an Agent
        </Link>
        <Link href="/lineage" className="px-6 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 rounded-lg font-medium transition-colors">
          Explore Lineage
        </Link>
      </div>
    </div>
  );
}
