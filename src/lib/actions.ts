"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, deleteSession, verifySession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { deleteDocumentFile, saveDocumentFile } from "@/lib/documents";
import { getAccountInvestableBalance } from "@/lib/data";

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const credential = await prisma.appCredential.findFirst();
  if (!credential || credential.username !== username || !verifyPassword(password, credential.passwordHash)) {
    return { error: "Wrong username or password" };
  }

  await createSession(credential.id);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export type ChangeCredentialsState = { error?: string; success?: string } | undefined;

export async function changeCredentials(
  _prevState: ChangeCredentialsState,
  formData: FormData
): Promise<ChangeCredentialsState> {
  const session = await verifySession();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newUsername = String(formData.get("newUsername") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");

  const credential = await prisma.appCredential.findUniqueOrThrow({
    where: { id: session.credentialId },
  });

  if (!verifyPassword(currentPassword, credential.passwordHash)) {
    return { error: "Current password is wrong" };
  }
  if (!newUsername) {
    return { error: "Username can't be empty" };
  }
  if (newPassword && newPassword.length < 8) {
    return { error: "New password must be at least 8 characters" };
  }

  await prisma.appCredential.update({
    where: { id: credential.id },
    data: {
      username: newUsername,
      passwordHash: newPassword ? hashPassword(newPassword) : credential.passwordHash,
    },
  });

  return { success: "Login credentials updated" };
}

function parseAmount(raw: FormDataEntryValue | null): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Amount must be a positive number");
  }
  return value;
}

// Optional attachment on a transaction/investment creation form. Absent or
// empty file input means "no attachment" — never required.
async function saveOptionalAttachment(formData: FormData): Promise<string | null> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;

  const { filePath, fileSize } = await saveDocumentFile(file);
  const document = await prisma.document.create({
    data: {
      fileName: file.name,
      filePath,
      fileSize,
      mimeType: file.type || "application/octet-stream",
    },
  });
  return document.id;
}

export async function createTransaction(formData: FormData) {
  await verifySession();
  const accountId = String(formData.get("accountId") ?? "");
  const streamId = String(formData.get("streamId") ?? "");
  const type = String(formData.get("type") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const category = String(formData.get("category") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const amount = parseAmount(formData.get("amount"));

  if (!accountId || !streamId) throw new Error("Account and stream are required");
  if (type !== "income" && type !== "expense") throw new Error("Invalid type");

  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const documentId = await saveOptionalAttachment(formData);

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
    },
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/investments");
  redirect("/transactions");
}

export async function deleteTransaction(formData: FormData) {
  await verifySession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing transaction id");

  const transaction = await prisma.transaction.delete({ where: { id } });
  if (transaction.documentId) {
    const document = await prisma.document.delete({ where: { id: transaction.documentId } });
    await deleteDocumentFile(document.filePath);
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/investments");
}

export async function createTransfer(formData: FormData) {
  await verifySession();
  const fromAccountId = String(formData.get("fromAccountId") ?? "");
  const toAccountId = String(formData.get("toAccountId") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const fromAmount = parseAmount(formData.get("fromAmount"));

  if (!fromAccountId || !toAccountId) throw new Error("Both accounts are required");
  if (fromAccountId === toAccountId) throw new Error("Can't transfer an account to itself");

  const { account: fromAccount, available } = await getAccountInvestableBalance(fromAccountId);
  const toAccount = await prisma.account.findUniqueOrThrow({ where: { id: toAccountId } });

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
    },
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/investments");
  redirect("/transactions");
}

export async function deleteTransfer(formData: FormData) {
  await verifySession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing transfer id");

  await prisma.transfer.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/investments");
}

export async function createInvestment(formData: FormData) {
  await verifySession();
  const name = String(formData.get("name") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const type = String(formData.get("type") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const amount = parseAmount(formData.get("amount"));

  if (!name) throw new Error("Investment name is required");
  if (!accountId) throw new Error("Funding account is required");

  const { account, available } = await getAccountInvestableBalance(accountId);

  if (amount > available) {
    throw new Error(
      `Not enough in ${account.name}: available ${available.toFixed(2)} ${account.currency}, tried to invest ${amount.toFixed(2)}.`
    );
  }

  const documentId = await saveOptionalAttachment(formData);

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
    },
  });

  revalidatePath("/investments");
  revalidatePath("/");
  redirect("/investments");
}

export async function deleteInvestment(formData: FormData) {
  await verifySession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing investment id");

  const investment = await prisma.investment.delete({ where: { id } });
  if (investment.documentId) {
    const document = await prisma.document.delete({ where: { id: investment.documentId } });
    await deleteDocumentFile(document.filePath);
  }

  revalidatePath("/investments");
  revalidatePath("/");
}

export async function createInvestmentReturn(formData: FormData) {
  await verifySession();
  const investmentId = String(formData.get("investmentId") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const amount = parseAmount(formData.get("amount"));

  if (!investmentId) throw new Error("Missing investment id");

  const investment = await prisma.investment.findUniqueOrThrow({ where: { id: investmentId } });

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
}

export async function updateInvestmentStatus(formData: FormData) {
  await verifySession();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["active", "exited", "lost"].includes(status)) {
    throw new Error("Invalid investment status update");
  }
  await prisma.investment.update({ where: { id }, data: { status } });
  revalidatePath("/investments");
}

export async function createStream(formData: FormData) {
  await verifySession();
  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();

  if (!name) throw new Error("Stream name is required");
  if (!currency) throw new Error("Currency is required");

  const existing = await prisma.stream.findFirst({ where: { name } });
  if (existing) throw new Error(`A stream named "${name}" already exists`);

  await prisma.stream.create({ data: { name, currency } });

  revalidatePath("/");
  revalidatePath("/streams");
  revalidatePath("/transactions");
}

export async function deleteStream(formData: FormData) {
  await verifySession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing stream id");

  const transactionCount = await prisma.transaction.count({ where: { streamId: id } });
  if (transactionCount > 0) {
    throw new Error(
      `Can't delete: ${transactionCount} transaction(s) still use this stream. Delete or reassign them first.`
    );
  }

  await prisma.stream.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/streams");
  revalidatePath("/transactions");
}

export async function createAccount(formData: FormData) {
  await verifySession();
  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  const type = String(formData.get("type") ?? "").trim() || "bank";
  const role = String(formData.get("role") ?? "").trim() || "operating";

  if (!name) throw new Error("Account name is required");
  if (!currency) throw new Error("Currency is required");

  const existing = await prisma.account.findFirst({ where: { name } });
  if (existing) throw new Error(`An account named "${name}" already exists`);

  await prisma.account.create({ data: { name, currency, type, role } });

  revalidatePath("/");
  revalidatePath("/streams");
  revalidatePath("/transactions");
  revalidatePath("/investments");
}

export async function deleteAccount(formData: FormData) {
  await verifySession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing account id");

  const [transactionCount, investmentCount, transferCount] = await Promise.all([
    prisma.transaction.count({ where: { accountId: id } }),
    prisma.investment.count({ where: { accountId: id } }),
    prisma.transfer.count({ where: { OR: [{ fromAccountId: id }, { toAccountId: id }] } }),
  ]);
  if (transactionCount > 0 || investmentCount > 0 || transferCount > 0) {
    throw new Error(
      `Can't delete: ${transactionCount} transaction(s), ${investmentCount} investment(s), and ${transferCount} transfer(s) still use this account. Delete or reassign them first.`
    );
  }

  await prisma.account.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/streams");
  revalidatePath("/transactions");
  revalidatePath("/investments");
}
