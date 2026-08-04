"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseAmount(raw: FormDataEntryValue | null): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Amount must be a positive number");
  }
  return value;
}

export async function createTransaction(formData: FormData) {
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
    },
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  redirect("/transactions");
}

export async function deleteTransaction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing transaction id");
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/transactions");
}

async function getAccountInvestableBalance(accountId: string) {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    include: { transactions: true, investments: { include: { returns: true } } },
  });
  const transactionBalance = account.transactions.reduce(
    (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
    0
  );
  const totalInvested = account.investments.reduce((sum, i) => sum + i.amount, 0);
  const totalReturned = account.investments.reduce(
    (sum, i) => sum + i.returns.reduce((s, r) => s + r.amount, 0),
    0
  );
  return { account, available: transactionBalance - totalInvested + totalReturned };
}

export async function createInvestment(formData: FormData) {
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

  await prisma.investment.create({
    data: {
      name,
      amount,
      currency: account.currency,
      date: dateRaw ? new Date(dateRaw) : new Date(),
      type,
      notes,
      accountId,
    },
  });

  revalidatePath("/investments");
  revalidatePath("/");
  redirect("/investments");
}

export async function createInvestmentReturn(formData: FormData) {
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
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["active", "exited", "lost"].includes(status)) {
    throw new Error("Invalid investment status update");
  }
  await prisma.investment.update({ where: { id }, data: { status } });
  revalidatePath("/investments");
}
