import Link from "next/link";
import { notFound } from "next/navigation";
import { getTransaction, getAccounts, getStreams } from "@/lib/data";
import { updateTransaction } from "@/lib/actions";
import { verifySession } from "@/lib/session";
import { formatFileSize } from "@/lib/format";
import { TransactionForm } from "@/components/transaction-form";

export const dynamic = "force-dynamic";

export default async function EditTransactionPage(props: PageProps<"/transactions/[id]/edit">) {
  const { userId } = await verifySession();
  const { id } = await props.params;

  const [transaction, accounts, streams] = await Promise.all([
    getTransaction(userId, id),
    getAccounts(userId),
    getStreams(userId),
  ]);
  if (!transaction) notFound();

  const dateValue = transaction.date.toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/transactions" className="link-primary">
          &lt;- Transactions
        </Link>
      </div>

      <section className="card">
        <h1 className="font-heading text-lg font-semibold">Edit Transaction</h1>
        <TransactionForm
          accounts={accounts}
          streams={streams}
          today={dateValue}
          action={updateTransaction}
          submitLabel="Save changes"
          defaultValues={{
            id: transaction.id,
            date: dateValue,
            type: transaction.type === "expense" ? "expense" : "income",
            amount: transaction.amount,
            streamId: transaction.streamId,
            accountId: transaction.accountId,
            category: transaction.category ?? "",
            note: transaction.note ?? "",
            documentLabel: transaction.document
              ? `Replace receipt (currently: ${transaction.document.fileName}, ${formatFileSize(transaction.document.fileSize)})`
              : "Add receipt (optional)",
          }}
        />
        <Link href="/transactions" className="btn-secondary mt-3 inline-block">
          Cancel
        </Link>
      </section>
    </div>
  );
}
