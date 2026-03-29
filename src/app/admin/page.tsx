import Link from "next/link";

export default function AdminPage() {
  return (
    <main
      className="mx-auto max-w-2xl px-6 py-16 text-slate-200"
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      <p className="text-sm font-medium uppercase tracking-widest text-emerald-400/90">
        Mazra Hospital
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
        Console (placeholder)
      </h1>
      <p className="mt-4 text-slate-400">
        The legacy simulation control panel (mode switch, tick, Kanta-target
        writes) has been removed. The operator console for API keys, profiles,
        and usage will ship with the Mazra Hospital access layer.
      </p>
      <p className="mt-6 text-sm text-slate-500">
        Spec:{" "}
        <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
          docs/MAZRA_HOSPITAL_PLAN.md
        </code>{" "}
        · Section 7 (Console surface).
      </p>
      <Link
        href="/"
        className="mt-10 inline-block text-emerald-400/90 underline-offset-4 hover:underline"
      >
        ← Home
      </Link>
    </main>
  );
}
