"use client";

import { useActionState } from "react";
import { adminUpdateReportSchedule, adminSendReportsNow } from "@/lib/actions";

type Schedule = { enabled: boolean; dayOfMonth: number; hour: number; lastSentYearMonth: string | null };

export function ReportScheduleForm({ schedule }: { schedule: Schedule }) {
  const [saveState, saveAction, savePending] = useActionState(adminUpdateReportSchedule, undefined);
  const [sendState, sendAction, sendPending] = useActionState(adminSendReportsNow, undefined);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <form action={saveAction} className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="enabled"
            value="true"
            defaultChecked={schedule.enabled}
            className="cursor-pointer"
          />
          Send monthly reports
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="field-label">Day of month</span>
          <input
            type="number"
            name="dayOfMonth"
            min={1}
            max={28}
            defaultValue={schedule.dayOfMonth}
            required
            className="input w-24"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="field-label">Hour (0–23, server time)</span>
          <input
            type="number"
            name="hour"
            min={0}
            max={23}
            defaultValue={schedule.hour}
            required
            className="input w-24"
          />
        </label>
        <button type="submit" disabled={savePending} className="btn-primary">
          {savePending ? "Saving..." : "Save schedule"}
        </button>
      </form>

      <p className="text-xs text-foreground/40">
        Last sent: {schedule.lastSentYearMonth ?? "never"}. Requires{" "}
        <code className="rounded bg-muted px-1">scripts/send-monthly-reports.ts</code> to be run hourly (e.g. via
        cron) — this page only controls when it decides to send.
      </p>

      <form action={sendAction}>
        <button type="submit" disabled={sendPending} className="btn-ghost-sm border border-border">
          {sendPending ? "Sending..." : "Send last month's reports now"}
        </button>
      </form>

      {(saveState?.error || sendState?.error) && (
        <p className="text-sm text-destructive">{saveState?.error || sendState?.error}</p>
      )}
      {(saveState?.success || sendState?.success) && (
        <p className="text-sm text-accent">{saveState?.success || sendState?.success}</p>
      )}
    </div>
  );
}
