import {
  getStreamsWithTransactionCounts,
  getAccountsWithUsageCounts,
  getUser,
} from "@/lib/data";
import { createStream, deleteStream, createAccount, deleteAccount } from "@/lib/actions";
import { ChangeCredentialsForm } from "@/components/change-credentials-form";
import { BrandingForm } from "@/components/branding-form";
import { verifySession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ACCOUNT_TYPES = ["bank", "wallet", "cash"] as const;
const ACCOUNT_ROLES = ["operating", "spending", "savings"] as const;

export default async function StreamsPage() {
  const { userId } = await verifySession();
  const [streams, accounts, user] = await Promise.all([
    getStreamsWithTransactionCounts(userId),
    getAccountsWithUsageCounts(userId),
    getUser(userId),
  ]);
  const currentUsername = user.username;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="font-heading text-2xl font-semibold">Manage Streams &amp; Accounts</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Add new income streams or accounts, or remove ones you no longer need.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-muted p-4">
        <h2 className="font-heading text-lg font-semibold">Income Streams</h2>
        <form action={createStream} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Name</span>
            <input
              type="text"
              name="name"
              placeholder="e.g. Freelance Design"
              required
              className="w-56 rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Currency</span>
            <input
              type="text"
              name="currency"
              placeholder="RMB, BDT, USD..."
              required
              maxLength={6}
              className="w-32 rounded-md border border-border bg-background px-3 py-2 uppercase outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary/90"
          >
            Add stream
          </button>
        </form>

        <ul className="mt-4 flex flex-col gap-2">
          {streams.map(({ stream, transactionCount }) => (
            <li
              key={stream.id}
              className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{stream.name}</span>
                <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/50">
                  {stream.currency}
                </span>
              </div>
              {transactionCount > 0 ? (
                <span className="text-xs text-foreground/40">
                  {transactionCount} transaction{transactionCount === 1 ? "" : "s"} — remove those first
                </span>
              ) : (
                <form action={deleteStream}>
                  <input type="hidden" name="id" value={stream.id} />
                  <button
                    type="submit"
                    className="cursor-pointer text-xs text-foreground/50 hover:text-destructive"
                  >
                    Delete
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-muted p-4">
        <h2 className="font-heading text-lg font-semibold">Accounts</h2>
        <form action={createAccount} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Name</span>
            <input
              type="text"
              name="name"
              placeholder="e.g. USD Bank Account"
              required
              className="w-56 rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Currency</span>
            <input
              type="text"
              name="currency"
              placeholder="RMB, BDT, USD..."
              required
              maxLength={6}
              className="w-28 rounded-md border border-border bg-background px-3 py-2 uppercase outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Type</span>
            <select
              name="type"
              defaultValue="bank"
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Role</span>
            <select
              name="role"
              defaultValue="operating"
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            >
              {ACCOUNT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary/90"
          >
            Add account
          </button>
        </form>

        <ul className="mt-4 flex flex-col gap-2">
          {accounts.map(({ account, transactionCount, investmentCount, transferCount }) => {
            const usageCount = transactionCount + investmentCount + transferCount;
            return (
              <li
                key={account.id}
                className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{account.name}</span>
                  <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/50">
                    {account.currency}
                  </span>
                  <span className="text-xs text-foreground/40">
                    {account.type} · {account.role}
                  </span>
                </div>
                {usageCount > 0 ? (
                  <span className="text-xs text-foreground/40">
                    {transactionCount} transaction{transactionCount === 1 ? "" : "s"}, {investmentCount}{" "}
                    investment{investmentCount === 1 ? "" : "s"}, {transferCount} transfer
                    {transferCount === 1 ? "" : "s"} — remove those first
                  </span>
                ) : (
                  <form action={deleteAccount}>
                    <input type="hidden" name="id" value={account.id} />
                    <button
                      type="submit"
                      className="cursor-pointer text-xs text-foreground/50 hover:text-destructive"
                    >
                      Delete
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {currentUsername && (
        <section className="rounded-lg border border-border bg-muted p-4">
          <h2 className="font-heading text-lg font-semibold">Login Credentials</h2>
          <p className="text-sm text-foreground/60">Currently signed in as {currentUsername}.</p>
          <ChangeCredentialsForm currentUsername={currentUsername} />
        </section>
      )}

      <section className="rounded-lg border border-border bg-muted p-4">
        <h2 className="font-heading text-lg font-semibold">Branding</h2>
        <p className="text-sm text-foreground/60">
          Shown in the nav bar and on generated invoices/statements instead of the default name.
        </p>
        <BrandingForm currentDisplayName={user.displayName} currentLogoDataUrl={user.logoDataUrl} />
      </section>
    </div>
  );
}
