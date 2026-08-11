import {
  getStreamsWithTransactionCounts,
  getAccountsWithUsageCounts,
  getUser,
} from "@/lib/data";
import { createStream, deleteStream, createAccount, deleteAccount } from "@/lib/actions";
import { ChangeCredentialsForm } from "@/components/change-credentials-form";
import { BrandingForm } from "@/components/branding-form";
import { ReportEmailForm } from "@/components/report-email-form";
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
        <p className="mt-2 text-sm text-foreground/50">
          <span className="font-medium text-foreground/70">Streams</span> track where money comes from (income
          sources, like a job or a business). <span className="font-medium text-foreground/70">Accounts</span> track
          where money physically lives (bank, wallet, cash). Every transaction picks one of each.
        </p>
      </section>

      <section className="card">
        <h2 className="font-heading text-lg font-semibold">Income Streams</h2>
        <form action={createStream} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="field-label">Name</span>
            <input type="text" name="name" placeholder="e.g. Freelance Design" required className="input w-56" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="field-label">Currency</span>
            <input
              type="text"
              name="currency"
              placeholder="RMB, BDT, USD..."
              required
              maxLength={6}
              className="input w-32 uppercase"
            />
          </label>
          <button type="submit" className="btn-primary">
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
                <span className="badge">{stream.currency}</span>
              </div>
              {transactionCount > 0 ? (
                <span className="text-xs text-foreground/40">
                  {transactionCount} transaction{transactionCount === 1 ? "" : "s"} — remove those first
                </span>
              ) : (
                <form action={deleteStream}>
                  <input type="hidden" name="id" value={stream.id} />
                  <button type="submit" className="btn-ghost-sm hover:text-destructive">
                    Delete
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="font-heading text-lg font-semibold">Accounts</h2>
        <form action={createAccount} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="field-label">Name</span>
            <input type="text" name="name" placeholder="e.g. USD Bank Account" required className="input w-56" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="field-label">Currency</span>
            <input
              type="text"
              name="currency"
              placeholder="RMB, BDT, USD..."
              required
              maxLength={6}
              className="input w-28 uppercase"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="field-label">Type</span>
            <select name="type" defaultValue="bank" className="input">
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="field-label">Role</span>
            <select name="role" defaultValue="operating" className="input">
              {ACCOUNT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-primary">
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
                  <span className="badge">{account.currency}</span>
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
                    <button type="submit" className="btn-ghost-sm hover:text-destructive">
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
        <section className="card">
          <h2 className="font-heading text-lg font-semibold">Login Credentials</h2>
          <p className="text-sm text-foreground/60">Currently signed in as {currentUsername}.</p>
          <ChangeCredentialsForm currentUsername={currentUsername} />
        </section>
      )}

      <section className="card">
        <h2 className="font-heading text-lg font-semibold">Branding</h2>
        <p className="text-sm text-foreground/60">
          Shown in the nav bar and on generated invoices/statements instead of the default name.
        </p>
        <BrandingForm currentDisplayName={user.displayName} currentLogoDataUrl={user.logoDataUrl} />
      </section>

      <section className="card">
        <h2 className="font-heading text-lg font-semibold">Monthly Report Email</h2>
        <p className="text-sm text-foreground/60">
          Where your monthly income/expense summary gets sent, if the admin has report emails turned on.
        </p>
        <ReportEmailForm currentEmail={user.email} />
      </section>
    </div>
  );
}
