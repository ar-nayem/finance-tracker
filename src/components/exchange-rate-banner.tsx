import { setExchangeRate } from "@/lib/actions";

// Shown wherever RMB amounts get entered, so the rate used to think in BDT
// terms is always visible and one click away from updating — never a stale
// number tucked away on a different page.
export function ExchangeRateBanner({ rate }: { rate: number | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted p-4">
      <div className="text-sm">
        <span className="text-foreground/60">RMB → BDT rate:</span>{" "}
        <span className="font-heading font-semibold">{rate ? rate.toFixed(4) : "not set"}</span>
      </div>
      <form action={setExchangeRate} className="flex items-center gap-2">
        <input
          type="number"
          step="0.0001"
          name="rate"
          placeholder={rate ? String(rate) : "e.g. 17.2"}
          className="input w-28 py-1.5"
          required
        />
        <button type="submit" className="btn-primary px-3 py-1.5">
          Update rate
        </button>
      </form>
    </div>
  );
}
