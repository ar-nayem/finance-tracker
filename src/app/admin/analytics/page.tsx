import { getVisitorAnalytics } from "@/lib/data";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const { perUser, recentLogins, recentPageViews } = await getVisitorAnalytics();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="font-heading text-2xl font-semibold">Visitor Analysis</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Login activity and page/feature usage across every user.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-muted p-4">
        <h2 className="font-heading text-lg font-semibold">Per-User Summary</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-foreground/50">
                <th className="py-2 pr-3 font-medium">User</th>
                <th className="py-2 pr-3 font-medium">Last login</th>
                <th className="py-2 pr-3 text-right font-medium">Logins</th>
                <th className="py-2 pr-3 text-right font-medium">Page views</th>
                <th className="py-2 pl-3 font-medium">Top pages</th>
              </tr>
            </thead>
            <tbody>
              {perUser.map(({ user, loginCount, pageViewCount, lastLogin, topPaths }) => (
                <tr key={user.id} className="border-b border-border/50">
                  <td className="py-2 pr-3">
                    <span className="font-medium">{user.username}</span>
                    <span className="ml-2 rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/50">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-foreground/70">
                    {lastLogin ? formatDateTime(lastLogin.createdAt) : "never"}
                  </td>
                  <td className="py-2 pr-3 text-right text-foreground/70">{loginCount}</td>
                  <td className="py-2 pr-3 text-right text-foreground/70">{pageViewCount}</td>
                  <td className="py-2 pl-3 text-foreground/70">
                    {topPaths.length > 0
                      ? topPaths.map((p) => `${p.path} (${p.count})`).join(", ")
                      : "—"}
                  </td>
                </tr>
              ))}
              {perUser.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-foreground/50">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted p-4">
          <h2 className="font-heading text-lg font-semibold">Recent Logins</h2>
          <div className="mt-3 flex max-h-96 flex-col gap-2 overflow-y-auto text-sm">
            {recentLogins.map((event) => (
              <div key={event.id} className="rounded-md border border-border/50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{event.user.username}</span>
                  <span className="text-xs text-foreground/50">{formatDateTime(event.createdAt)}</span>
                </div>
                <div className="mt-0.5 text-xs text-foreground/50">
                  {event.ipAddress ?? "unknown IP"}
                  {event.userAgent ? ` · ${event.userAgent}` : ""}
                </div>
              </div>
            ))}
            {recentLogins.length === 0 && <p className="text-foreground/50">No logins recorded yet.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted p-4">
          <h2 className="font-heading text-lg font-semibold">Recent Page Views</h2>
          <div className="mt-3 flex max-h-96 flex-col gap-2 overflow-y-auto text-sm">
            {recentPageViews.map((view) => (
              <div
                key={view.id}
                className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2"
              >
                <div>
                  <span className="font-medium">{view.user.username}</span>
                  <span className="ml-2 text-foreground/70">{view.path}</span>
                </div>
                <span className="text-xs text-foreground/50">{formatDate(view.createdAt)}</span>
              </div>
            ))}
            {recentPageViews.length === 0 && <p className="text-foreground/50">No page views recorded yet.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
