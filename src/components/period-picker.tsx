import Link from "next/link";
import { PERIOD_LABELS, type Period, type RangeSelection } from "@/lib/data";

// Preset-period buttons + a custom from/to form, both driving the same
// `?period=` / `?from=&to=` query params that resolveRangeSelection() reads.
// Plain links/native form GET — no client JS needed, works from any page.
export function PeriodPicker({ basePath, selection }: { basePath: string; selection: RangeSelection }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <Link
            key={p}
            href={`${basePath}?period=${p}`}
            scroll={false}
            className={`pill ${selection.kind === "preset" && selection.period === p ? "pill-active" : "pill-inactive"}`}
          >
            {p.toUpperCase()}
          </Link>
        ))}
      </div>
      <form
        action={basePath}
        className={`flex items-center gap-1 rounded-md border px-2 py-1 ${
          selection.kind === "custom" ? "border-primary" : "border-border"
        }`}
      >
        <input
          type="date"
          name="from"
          defaultValue={selection.kind === "custom" ? selection.from.toISOString().slice(0, 10) : undefined}
          aria-label="From date"
          required
          className="rounded-md bg-background px-2 py-1 text-xs outline-none"
        />
        <span className="text-xs text-foreground/40">to</span>
        <input
          type="date"
          name="to"
          defaultValue={selection.kind === "custom" ? selection.to.toISOString().slice(0, 10) : undefined}
          aria-label="To date"
          required
          className="rounded-md bg-background px-2 py-1 text-xs outline-none"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-md bg-primary px-2 py-1 text-xs font-medium text-on-primary hover:bg-primary/90"
        >
          Apply
        </button>
      </form>
    </div>
  );
}
