
import Link from "next/link";
import { pineCall } from "~/server";

export default function HomePage() {
  pineCall()
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b text-white">
      <button
      className="btn border-t-cyan-900 text-white font-bold shadow-sm border border-1 border-blue-400">
        Press me to run
      </button>
    </main>
  );
}
