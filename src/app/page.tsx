import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-emerald-400/90">
        Zyntel · Mazra Hospital
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
        Mazra
      </h1>
      <p className="mt-4 text-lg text-slate-400">
        Standalone synthetic hospital database: profile-scoped laboratory and
        operations data served over REST and read-only Postgres—your own
        Supabase project, no consumer-schema coupling.
      </p>
      <ul className="mt-10 space-y-3 text-slate-300">
        <li>
          <strong className="text-white">Plan:</strong>{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm">
            docs/MAZRA_HOSPITAL_PLAN.md
          </code>
        </li>
        <li>
          <strong className="text-white">Status:</strong>{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm">
            PROJECT_STATUS.md
          </code>
        </li>
        <li>
          <strong className="text-white">Transition:</strong>{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm">
            REFACTOR.md
          </code>
        </li>
      </ul>
      <p className="mt-8">
        <Link
          href="/admin"
          className="text-emerald-400/90 underline-offset-4 hover:underline"
        >
          Admin placeholder
        </Link>
      </p>
    </main>
  );
}
