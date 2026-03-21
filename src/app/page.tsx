export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-emerald-400/90">
        Zyntel · Pre-build
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
        Mazra
      </h1>
      <p className="mt-4 text-lg text-slate-400">
        Hospital data simulation engine. Generates deterministic, realistic
        streams (TAT, revenue, equipment, refrigerators, QC, staff) into Kanta
        tables for demos and testing.
      </p>
      <ul className="mt-10 space-y-3 text-slate-300">
        <li>
          <strong className="text-white">Engine:</strong>{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm">
            src/engine/
          </code>
        </li>
        <li>
          <strong className="text-white">Seeder (CLI):</strong>{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm">
            npm run seed
          </code>
        </li>
        <li>
          <strong className="text-white">Plan:</strong>{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm">
            docs/MAZRA_PLAN.md
          </code>
        </li>
      </ul>
    </main>
  );
}
