// Entry point for the monthly report email cron. Meant to be invoked
// hourly (e.g. `0 * * * * cd /path/to/app && npx tsx scripts/send-monthly-reports.ts`)
// — it's a no-op unless the admin-configured schedule (day of month + hour,
// server local time) has arrived and this month hasn't been sent yet.
import "dotenv/config";
import { format, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getReportSchedule, getUsersWithReportEmail, buildMonthlyReportEmail } from "@/lib/reports";
import { sendMail, isMailConfigured } from "@/lib/mail";

async function main() {
  const schedule = await getReportSchedule();
  if (!schedule.enabled) {
    console.log("Report schedule is disabled — nothing to do.");
    return;
  }

  const now = new Date();
  const currentYearMonth = format(now, "yyyy-MM");
  if (schedule.lastSentYearMonth === currentYearMonth) {
    console.log(`Already sent for ${currentYearMonth}.`);
    return;
  }

  // >= rather than an exact match: this only runs on an hourly check, so a
  // missed or delayed run still catches up later in the day/month instead
  // of silently skipping the month. lastSentYearMonth (checked above) is
  // what stops it from then re-sending on every subsequent hourly check.
  const due =
    now.getDate() > schedule.dayOfMonth ||
    (now.getDate() === schedule.dayOfMonth && now.getHours() >= schedule.hour);
  if (!due) {
    console.log(`Not due yet — scheduled for day ${schedule.dayOfMonth}, hour ${schedule.hour}.`);
    return;
  }

  if (!isMailConfigured()) {
    console.error("Schedule is due but SMTP_HOST/SMTP_USER/SMTP_PASS aren't set — leaving unsent, will retry.");
    return;
  }

  const users = await getUsersWithReportEmail();
  const lastMonth = subMonths(now, 1);
  console.log(`Sending ${format(lastMonth, "MMMM yyyy")} reports to ${users.length} user(s)...`);

  for (const user of users) {
    try {
      const { subject, text, html } = await buildMonthlyReportEmail(user.id, lastMonth);
      await sendMail({ to: user.email!, subject, text, html });
      console.log(`  sent to ${user.email}`);
    } catch (err) {
      // One recipient's failure (bad address, mailbox full) shouldn't stop
      // the rest of the batch, and shouldn't block the month from being
      // marked sent — an admin re-running by hand is the recovery path.
      console.error(`  FAILED for ${user.email}:`, err instanceof Error ? err.message : err);
    }
  }

  await prisma.reportSchedule.update({
    where: { id: schedule.id },
    data: { lastSentYearMonth: currentYearMonth },
  });
  console.log(`Done. Marked ${currentYearMonth} as sent.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
