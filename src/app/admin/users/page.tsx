import { getAllUsers } from "@/lib/data";
import { adminResetPassword, toggleUserDisabled } from "@/lib/actions";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { CreateUserForm } from "@/components/create-user-form";
import { ReportScheduleForm } from "@/components/report-schedule-form";
import { getReportSchedule } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { userId: adminId } = await requireAdmin();
  const [users, schedule] = await Promise.all([getAllUsers(), getReportSchedule()]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="font-heading text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Invite-only — create a login and hand the credentials to whoever needs one.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-muted p-4">
        <h2 className="font-heading text-lg font-semibold">Create User</h2>
        <CreateUserForm />
      </section>

      <section className="rounded-lg border border-border bg-muted p-4">
        <h2 className="font-heading text-lg font-semibold">All Users</h2>
        <div className="mt-3 flex flex-col gap-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{u.username}</span>
                <span className="ml-2 rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/50">
                  {u.role}
                </span>
                {u.disabled && (
                  <span className="ml-2 rounded-full bg-destructive/20 px-2 py-0.5 text-xs text-destructive">
                    disabled
                  </span>
                )}
                <div className="mt-0.5 text-xs text-foreground/40">Created {formatDate(u.createdAt)}</div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <form action={adminResetPassword} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <input
                    type="password"
                    name="password"
                    placeholder="new password"
                    minLength={8}
                    required
                    className="w-36 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground/80 hover:bg-foreground/5"
                  >
                    Reset password
                  </button>
                </form>

                {u.id !== adminId && (
                  <form action={toggleUserDisabled}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="disabled" value={String(!u.disabled)} />
                    <button
                      type="submit"
                      className={`cursor-pointer rounded-md border px-2 py-1 text-xs font-medium ${
                        u.disabled
                          ? "border-accent text-accent hover:bg-accent/10"
                          : "border-destructive text-destructive hover:bg-destructive/10"
                      }`}
                    >
                      {u.disabled ? "Enable" : "Disable"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-muted p-4">
        <h2 className="font-heading text-lg font-semibold">Monthly Reports</h2>
        <p className="text-sm text-foreground/60">
          Emails each user their income/expense summary for the previous month. Users set their own address under
          Manage.
        </p>
        <ReportScheduleForm schedule={schedule} />
      </section>
    </div>
  );
}
