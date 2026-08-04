import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "../src/lib/password";
import "dotenv/config";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const accounts = [
    { name: "Chinese Bank Account", currency: "RMB", type: "bank", role: "operating" },
    { name: "Alipay", currency: "RMB", type: "wallet", role: "operating" },
    { name: "WeChat Pay", currency: "RMB", type: "wallet", role: "spending" },
    { name: "BDT Bank Account 1", currency: "BDT", type: "bank", role: "operating" },
    { name: "BDT Bank Account 2", currency: "BDT", type: "bank", role: "savings" },
    { name: "Cash (RMB)", currency: "RMB", type: "cash", role: "operating" },
    { name: "Cash (BDT)", currency: "BDT", type: "cash", role: "operating" },
  ];

  const createdAccounts: Record<string, string> = {};
  for (const a of accounts) {
    const existing = await prisma.account.findFirst({ where: { name: a.name } });
    const acc = existing ?? (await prisma.account.create({ data: a }));
    createdAccounts[a.name] = acc.id;
  }

  const streams = [
    { name: "Job 1", currency: "RMB" },
    { name: "Job 2", currency: "RMB" },
    { name: "Main Business", currency: "RMB" },
    { name: "Side Business", currency: "BDT" },
    { name: "E-commerce Business", currency: "BDT" },
    { name: "Agency Business", currency: "RMB" },
    { name: "Teaching", currency: "RMB" },
    { name: "Trading Business", currency: "BDT" },
  ];

  for (const s of streams) {
    const existing = await prisma.stream.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.stream.create({ data: s });
    }
  }

  const existingCredential = await prisma.appCredential.findFirst();
  if (!existingCredential) {
    const username = process.env.INITIAL_LOGIN_USERNAME;
    const password = process.env.INITIAL_LOGIN_PASSWORD;
    if (username && password) {
      await prisma.appCredential.create({
        data: { username, passwordHash: hashPassword(password) },
      });
      console.log("Seeded initial login credential for:", username);
    } else {
      console.log(
        "No AppCredential exists yet, and INITIAL_LOGIN_USERNAME/INITIAL_LOGIN_PASSWORD not set — skipping. Set them in .env and re-run seed to create the first login."
      );
    }
  }

  console.log("Seeded accounts:", Object.keys(createdAccounts));
  console.log("Seeded streams:", streams.map((s) => s.name));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
