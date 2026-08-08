"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { subMonths } from "date-fns";
import { createSession, deleteSession, verifySession, requireAdmin } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { deleteDocumentFile, saveDocumentFile } from "@/lib/documents";
import { getAccountInvestableBalance } from "@/lib/data";
import {
  getReportSchedule,
  getUsersWithReportEmail,
  buildMonthlyReportEmail,
  buildMonthlyReportAttachments,
} from "@/lib/reports";
import { sendMail, isMailConfigured } from "@/lib/mail";

const WRONG_CREDENTIALS_ERROR = "Wrong username or password";

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { username } });
  // Same generic error whether the user doesn't exist, the password is
  // wrong, or the account is disabled — none of those should be
  // distinguishable to someone probing the login form.
  if (!user || user.disabled || !verifyPassword(password, user.passwordHash)) {
    return { error: WRONG_CREDENTIALS_ERROR };
  }

  await createSession(user.id, user.sessionVersion);

  const hdrs = await headers();
  await prisma.loginEvent
    .create({
      data: {
        userId: user.id,
        ipAddress: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip"),
        userAgent: hdrs.get("user-agent"),
      },
    })
    .catch(() => {}); // never block a real login on a logging failure

  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

// Device display preference, not tied to a session/user — no auth check,
// harmless to toggle from anywhere including the (unauthenticated) login page.
export async function setTheme(formData: FormData) {
  const theme = String(formData.get("theme") ?? "") === "light" ? "light" : "dark";
  const cookieStore = await cookies();
  cookieStore.set("theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export type ChangeCredentialsState = { error?: string; success?: string } | undefined;

export async function changeCredentials(
  _prevState: ChangeCredentialsState,
  formData: FormData
): Promise<ChangeCredentialsState> {
  const { userId } = await verifySession();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newUsername = String(formData.get("newUsername") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return { error: "Current password is wrong" };
  }
  if (!newUsername) {
    return { error: "Username can't be empty" };
  }
  if (newPassword && newPassword.length < 8) {
    return { error: "New password must be at least 8 characters" };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        username: newUsername,
        passwordHash: newPassword ? hashPassword(newPassword) : user.passwordHash,
        // Bump so any other live session under the old password is forced
        // to re-authenticate — a password change should invalidate
        // sessions issued before it, not just future logins.
        ...(newPassword ? { sessionVersion: { increment: 1 } } : {}),
      },
    });
  } catch {
    return { error: `Username "${newUsername}" is already taken` };
  }

  if (newPassword) {
    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    await createSession(refreshed.id, refreshed.sessionVersion);
  }

  return { success: "Login credentials updated" };
}

const MAX_LOGO_BYTES = 300 * 1024; // stored inline on the User row and read on
// every page render (nav) — kept small on purpose, not a general upload.

export type BrandingState = { error?: string; success?: string } | undefined;

export async function updateBranding(
  _prevState: BrandingState,
  formData: FormData
): Promise<BrandingState> {
  const { userId } = await verifySession();
  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  const removeLogo = String(formData.get("removeLogo") ?? "") === "true";
  const file = formData.get("logo");

  let logoDataUrl: string | null | undefined = removeLogo ? null : undefined;
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { error: "Logo must be an image file" };
    }
    if (file.size > MAX_LOGO_BYTES) {
      return { error: `Logo must be under ${Math.round(MAX_LOGO_BYTES / 1024)}KB` };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    logoDataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      displayName,
      ...(logoDataUrl !== undefined ? { logoDataUrl } : {}),
    },
  });

  revalidatePath("/", "layout");
  return { success: "Branding updated" };
}

export type ReportEmailState = { error?: string; success?: string } | undefined;

export async function updateReportEmail(
  _prevState: ReportEmailState,
  formData: FormData
): Promise<ReportEmailState> {
  const { userId } = await verifySession();
  const email = String(formData.get("email") ?? "").trim();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "That doesn't look like a valid email address" };
  }

  await prisma.user.update({ where: { id: userId }, data: { email: email || null } });

  revalidatePath("/streams");
  return { success: email ? "Report email saved" : "Report email removed" };
}

// --- Admin: user management -------------------------------------------

export type AdminActionState = { error?: string; success?: string } | undefined;

export async function createUser(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "user") === "admin" ? "admin" : "user";

  if (!username) return { error: "Username is required" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };

  try {
    await prisma.user.create({
      data: { username, passwordHash: hashPassword(password), role },
    });
  } catch {
    return { error: `Username "${username}" is already taken` };
  }

  revalidatePath("/admin/users");
  return { success: `Created ${username}` };
}

export async function adminResetPassword(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!id) throw new Error("Missing user id");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  await prisma.user.update({
    where: { id },
    data: { passwordHash: hashPassword(password), sessionVersion: { increment: 1 } },
  });

  revalidatePath("/admin/users");
}

// Lets an admin set report email on a user's behalf, so the monthly send
// doesn't depend on every user separately visiting Manage and setting their
// own — the self-service field in updateReportEmail still wins if a user
// later changes it themselves.
export async function adminSetUserReportEmail(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  if (!id) throw new Error("Missing user id");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("That doesn't look like a valid email address");
  }

  await prisma.user.update({ where: { id }, data: { email: email || null } });

  revalidatePath("/admin/users");
}

export async function toggleUserDisabled(formData: FormData) {
  const { userId: adminId } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const disabled = String(formData.get("disabled") ?? "") === "true";
  if (!id) throw new Error("Missing user id");
  if (id === adminId) throw new Error("Can't disable your own account");

  await prisma.user.update({
    where: { id },
    data: { disabled, sessionVersion: { increment: 1 } },
  });

  revalidatePath("/admin/users");
}

// --- Admin: monthly report schedule -------------------------------------

export type ReportScheduleState = { error?: string; success?: string } | undefined;

export async function adminUpdateReportSchedule(
  _prevState: ReportScheduleState,
  formData: FormData
): Promise<ReportScheduleState> {
  await requireAdmin();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const dayOfMonth = Number(formData.get("dayOfMonth"));
  const hour = Number(formData.get("hour"));

  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
    return { error: "Day of month must be between 1 and 28" };
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return { error: "Hour must be between 0 and 23" };
  }

  const schedule = await getReportSchedule();
  await prisma.reportSchedule.update({
    where: { id: schedule.id },
    data: { enabled, dayOfMonth, hour },
  });

  revalidatePath("/admin/users");
  return { success: "Report schedule saved" };
}

// Manual trigger for the same send the cron script does, scoped to last
// calendar month — lets an admin verify SMTP + recipients work without
// waiting for the schedule to fire. Does not touch lastSentYearMonth, so it
// can't cause the cron to skip (or double-send) its own scheduled run.
export async function adminSendReportsNow(
  _prevState: ReportScheduleState,
  _formData: FormData
): Promise<ReportScheduleState> {
  await requireAdmin();
  if (!isMailConfigured()) {
    return { error: "Email isn't configured — set SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM in .env" };
  }

  const users = await getUsersWithReportEmail();
  if (users.length === 0) {
    return { error: "No users have a report email set" };
  }

  const lastMonth = subMonths(new Date(), 1);
  for (const user of users) {
    const { subject, text, html } = await buildMonthlyReportEmail(user.id, lastMonth);
    const attachments = await buildMonthlyReportAttachments(user.id, lastMonth, {
      displayName: user.displayName,
      logoDataUrl: user.logoDataUrl,
    });
    await sendMail({ to: user.email!, subject, text, html, attachments });
  }

  return { success: `Sent ${users.length} report${users.length === 1 ? "" : "s"}` };
}

// --- Everything below scoped to the signed-in user ----------------------

function parseAmount(raw: FormDataEntryValue | null): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Amount must be a positive number");
  }
  return value;
}

// Optional attachment on a transaction/investment creation form. Absent or
// empty file input means "no attachment" — never required.
async function saveOptionalAttachment(formData: FormData, userId: string): Promise<string | null> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;

  const { filePath, fileSize } = await saveDocumentFile(file);
  const document = await prisma.document.create({
    data: {
      fileName: file.name,
      filePath,
      fileSize,
      mimeType: file.type || "application/octet-stream",
      userId,
    },
  });
  return document.id;
}

export async function createTransaction(formData: FormData) {
  const { userId } = await verifySession();
  const accountId = String(formData.get("accountId") ?? "");
  const streamId = String(formData.get("streamId") ?? "");
  const type = String(formData.get("type") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const category = String(formData.get("category") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const amount = parseAmount(formData.get("amount"));

  if (!accountId || !streamId) throw new Error("Account and stream are required");
  if (type !== "income" && type !== "expense") throw new Error("Invalid type");

  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) throw new Error("Account not found");
  const stream = await prisma.stream.findFirst({ where: { id: streamId, userId } });
  if (!stream) throw new Error("Stream not found");

  const documentId = await saveOptionalAttachment(formData, userId);

  await prisma.transaction.create({
    data: {
      date: dateRaw ? new Date(dateRaw) : new Date(),
      amount,
      currency: account.currency,
      type,
      category,
      note,
      accountId,
      streamId,
      documentId,
      userId,
    },
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/investments");
  redirect("/transactions");
}

export async function updateTransaction(formData: FormData) {
  const { userId } = await verifySession();
  const id = String(formData.get("id") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const streamId = String(formData.get("streamId") ?? "");
  const type = String(formData.get("type") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const category = String(formData.get("category") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const amount = parseAmount(formData.get("amount"));

  if (!id) throw new Error("Missing transaction id");
  if (!accountId || !streamId) throw new Error("Account and stream are required");
  if (type !== "income" && type !== "expense") throw new Error("Invalid type");

  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Transaction not found");
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) throw new Error("Account not found");
  const stream = await prisma.stream.findFirst({ where: { id: streamId, userId } });
  if (!stream) throw new Error("Stream not found");

  // A newly chosen file replaces the existing attachment; leaving the file
  // input empty keeps whatever was already attached untouched.
  const newDocumentId = await saveOptionalAttachment(formData, userId);
  let documentId = existing.documentId;
  if (newDocumentId) {
    if (existing.documentId) {
      const oldDocument = await prisma.document.delete({ where: { id: existing.documentId, userId } });
      await deleteDocumentFile(oldDocument.filePath);
    }
    documentId = newDocumentId;
  }

  await prisma.transaction.update({
    where: { id, userId },
    data: {
      date: dateRaw ? new Date(dateRaw) : existing.date,
      amount,
      currency: account.currency,
      type,
      category,
      note,
      accountId,
      streamId,
      documentId,
    },
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/investments");
  redirect("/transactions");
}

export async function deleteTransaction(formData: FormData) {
  const { userId } = await verifySession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing transaction id");

  let transaction;
  try {
    transaction = await prisma.transaction.delete({ where: { id, userId } });
  } catch {
    throw new Error("Transaction not found");
  }
  if (transaction.documentId) {
    const document = await prisma.document.delete({ where: { id: transaction.documentId, userId } });
    await deleteDocumentFile(document.filePath);
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/investments");
}

export async function createTransfer(formData: FormData) {
  const { userId } = await verifySession();
  const fromAccountId = String(formData.get("fromAccountId") ?? "");
  const toAccountId = String(formData.get("toAccountId") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const fromAmount = parseAmount(formData.get("fromAmount"));

  if (!fromAccountId || !toAccountId) throw new Error("Both accounts are required");
  if (fromAccountId === toAccountId) throw new Error("Can't transfer an account to itself");

  const { account: fromAccount, available } = await getAccountInvestableBalance(fromAccountId, userId);
  const toAccount = await prisma.account.findFirst({ where: { id: toAccountId, userId } });
  if (!toAccount) throw new Error("Destination account not found");

  const toAmount =
    fromAccount.currency === toAccount.currency ? fromAmount : parseAmount(formData.get("toAmount"));

  if (fromAmount > available) {
    throw new Error(
      `Not enough in ${fromAccount.name}: available ${available.toFixed(2)} ${fromAccount.currency}, tried to transfer ${fromAmount.toFixed(2)}.`
    );
  }

  await prisma.transfer.create({
    data: {
      date: dateRaw ? new Date(dateRaw) : new Date(),
      fromAccountId,
      fromAmount,
      fromCurrency: fromAccount.currency,
      toAccountId,
      toAmount,
      toCurrency: toAccount.currency,
      note,
      userId,
    },
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/investments");
  redirect("/transactions");
}

export async function deleteTransfer(formData: FormData) {
  const { userId } = await verifySession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing transfer id");

  try {
    await prisma.transfer.delete({ where: { id, userId } });
  } catch {
    throw new Error("Transfer not found");
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/investments");
}

export async function createInvestment(formData: FormData) {
  const { userId } = await verifySession();
  const name = String(formData.get("name") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const type = String(formData.get("type") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const amount = parseAmount(formData.get("amount"));

  if (!name) throw new Error("Investment name is required");
  if (!accountId) throw new Error("Funding account is required");

  const { account, available } = await getAccountInvestableBalance(accountId, userId);

  if (amount > available) {
    throw new Error(
      `Not enough in ${account.name}: available ${available.toFixed(2)} ${account.currency}, tried to invest ${amount.toFixed(2)}.`
    );
  }

  const documentId = await saveOptionalAttachment(formData, userId);

  await prisma.investment.create({
    data: {
      name,
      amount,
      currency: account.currency,
      date: dateRaw ? new Date(dateRaw) : new Date(),
      type,
      notes,
      accountId,
      documentId,
      userId,
    },
  });

  revalidatePath("/investments");
  revalidatePath("/");
  redirect("/investments");
}

export async function deleteInvestment(formData: FormData) {
  const { userId } = await verifySession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing investment id");

  let investment;
  try {
    investment = await prisma.investment.delete({ where: { id, userId } });
  } catch {
    throw new Error("Investment not found");
  }
  if (investment.documentId) {
    const document = await prisma.document.delete({ where: { id: investment.documentId, userId } });
    await deleteDocumentFile(document.filePath);
  }

  revalidatePath("/investments");
  revalidatePath("/");
}

export async function createInvestmentReturn(formData: FormData) {
  const { userId } = await verifySession();
  const investmentId = String(formData.get("investmentId") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const amount = parseAmount(formData.get("amount"));

  if (!investmentId) throw new Error("Missing investment id");

  const investment = await prisma.investment.findFirst({ where: { id: investmentId, userId } });
  if (!investment) throw new Error("Investment not found");

  await prisma.investmentReturn.create({
    data: {
      investmentId,
      date: dateRaw ? new Date(dateRaw) : new Date(),
      amount,
      currency: investment.currency,
    },
  });

  revalidatePath("/investments");
  revalidatePath("/");
}

// Shared across every signed-in user — an external market rate, not
// personal financial data, so it isn't scoped by userId. See schema.prisma.
export async function setExchangeRate(formData: FormData) {
  await verifySession();
  const rate = Number(formData.get("rate"));
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Rate must be a positive number");

  await prisma.exchangeRate.upsert({
    where: {
      date_fromCurrency_toCurrency: {
        date: new Date(new Date().toDateString()),
        fromCurrency: "RMB",
        toCurrency: "BDT",
      },
    },
    update: { rate },
    create: {
      date: new Date(new Date().toDateString()),
      fromCurrency: "RMB",
      toCurrency: "BDT",
      rate,
    },
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/investments");
}

export async function updateInvestmentStatus(formData: FormData) {
  const { userId } = await verifySession();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["active", "exited", "lost"].includes(status)) {
    throw new Error("Invalid investment status update");
  }
  try {
    await prisma.investment.update({ where: { id, userId }, data: { status } });
  } catch {
    throw new Error("Investment not found");
  }
  revalidatePath("/investments");
}

export async function createStream(formData: FormData) {
  const { userId } = await verifySession();
  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();

  if (!name) throw new Error("Stream name is required");
  if (!currency) throw new Error("Currency is required");

  const existing = await prisma.stream.findFirst({ where: { name, userId } });
  if (existing) throw new Error(`A stream named "${name}" already exists`);

  await prisma.stream.create({ data: { name, currency, userId } });

  revalidatePath("/");
  revalidatePath("/streams");
  revalidatePath("/transactions");
}

export async function deleteStream(formData: FormData) {
  const { userId } = await verifySession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing stream id");

  const transactionCount = await prisma.transaction.count({ where: { streamId: id, userId } });
  if (transactionCount > 0) {
    throw new Error(
      `Can't delete: ${transactionCount} transaction(s) still use this stream. Delete or reassign them first.`
    );
  }

  try {
    await prisma.stream.delete({ where: { id, userId } });
  } catch {
    throw new Error("Stream not found");
  }

  revalidatePath("/");
  revalidatePath("/streams");
  revalidatePath("/transactions");
}

export async function createAccount(formData: FormData) {
  const { userId } = await verifySession();
  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  const type = String(formData.get("type") ?? "").trim() || "bank";
  const role = String(formData.get("role") ?? "").trim() || "operating";

  if (!name) throw new Error("Account name is required");
  if (!currency) throw new Error("Currency is required");

  const existing = await prisma.account.findFirst({ where: { name, userId } });
  if (existing) throw new Error(`An account named "${name}" already exists`);

  await prisma.account.create({ data: { name, currency, type, role, userId } });

  revalidatePath("/");
  revalidatePath("/streams");
  revalidatePath("/transactions");
  revalidatePath("/investments");
}

export async function deleteAccount(formData: FormData) {
  const { userId } = await verifySession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing account id");

  const [transactionCount, investmentCount, transferCount] = await Promise.all([
    prisma.transaction.count({ where: { accountId: id, userId } }),
    prisma.investment.count({ where: { accountId: id, userId } }),
    prisma.transfer.count({ where: { userId, OR: [{ fromAccountId: id }, { toAccountId: id }] } }),
  ]);
  if (transactionCount > 0 || investmentCount > 0 || transferCount > 0) {
    throw new Error(
      `Can't delete: ${transactionCount} transaction(s), ${investmentCount} investment(s), and ${transferCount} transfer(s) still use this account. Delete or reassign them first.`
    );
  }

  try {
    await prisma.account.delete({ where: { id, userId } });
  } catch {
    throw new Error("Account not found");
  }

  revalidatePath("/");
  revalidatePath("/streams");
  revalidatePath("/transactions");
  revalidatePath("/investments");
}
