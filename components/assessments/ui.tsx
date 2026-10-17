import Link from "next/link";

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white rounded-xl border border-slate-200 p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "indigo" | "emerald" | "amber";
}) {
  const tones = {
    default: "text-slate-900",
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  } as const;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-2xl font-semibold mt-2 ${tones[tone]}`}>{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

const BAND_STYLES: Record<string, string> = {
  below: "bg-red-50 text-red-700 border-red-200",
  developing: "bg-amber-50 text-amber-700 border-amber-200",
  at: "bg-slate-100 text-slate-700 border-slate-200",
  above: "bg-emerald-50 text-emerald-700 border-emerald-200",
  distinctive: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export function BandPill({ band }: { band: { id: string; label: string } | null }) {
  if (!band) return <span className="text-xs text-slate-400">Not assessed</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
        BAND_STYLES[band.id] ?? BAND_STYLES.at
      }`}
    >
      {band.label}
    </span>
  );
}

export function GapPill({ gap }: { gap: number | null }) {
  if (gap === null) return <span className="text-xs text-slate-300">—</span>;
  const blindSpot = gap >= 10;
  const hidden = gap <= -10;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        blindSpot
          ? "bg-amber-50 text-amber-700"
          : hidden
            ? "bg-sky-50 text-sky-700"
            : "bg-slate-100 text-slate-500"
      }`}
      title={
        blindSpot
          ? "Blind spot — rates self above observers"
          : hidden
            ? "Hidden strength — observers rate above self"
            : "Self and observer views aligned"
      }
    >
      {gap > 0 ? "+" : ""}
      {gap.toFixed(0)}
    </span>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-2">
          {i > 0 && <span className="text-slate-300">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-slate-900">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
      <span className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
      {label}
    </div>
  );
}

export function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
