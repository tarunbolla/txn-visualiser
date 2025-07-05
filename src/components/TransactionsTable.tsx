import React from "react";
import type { Transaction, Account } from "../data";
import { formatDate, formatCurrency } from "../data";

export interface TransactionsTableProps {
  transactions: (Transaction & { parsedDate?: Date; isFlagged?: boolean })[];
  accounts: Account[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onToggleFlag: (id: string) => void;
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  accounts,
  page,
  totalPages,
  onPageChange,
  onToggleFlag,
}) => {
  const [search, setSearch] = React.useState("");
  const getAccountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name || id;

  const filteredTransactions = React.useMemo(() => {
    if (!search.trim()) return transactions;
    const s = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      return (
        tx.id.toLowerCase().includes(s) ||
        (getAccountName(tx.from) &&
          getAccountName(tx.from).toLowerCase().includes(s)) ||
        (getAccountName(tx.to) && getAccountName(tx.to).toLowerCase().includes(s)) ||
        tx.from.toLowerCase().includes(s) ||
        tx.to.toLowerCase().includes(s) ||
        (tx.description && tx.description.toLowerCase().includes(s))
      );
    });
  }, [transactions, search, accounts]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ margin: 0 }}>Displayed Transactions</h4>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginLeft: "auto",
            marginBottom: 8,
            padding: "4px 8px",
            fontSize: 13,
            border: "1px solid #ccc",
            borderRadius: 4,
            minWidth: 180,
          }}
        />
      </div>
      <table>
        <thead>
          <tr>
            <th style={{ width: "20px" }}></th>
            <th>Date</th>
            <th>Transaction ID</th>
            <th>Sender Name</th>
            <th>Sender Account #</th>
            <th>Beneficiary Name</th>
            <th>Beneficiary Account #</th>
            <th style={{ textAlign: "right" }}>Amount (₹)</th>
            <th>Transaction Type</th>
            <th>Transaction Description</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions.length === 0 ? (
            <tr>
              <td colSpan={10}>No transactions found.</td>
            </tr>
          ) : (
            filteredTransactions.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <span
                    onClick={() => onToggleFlag(tx.id)}
                    style={{
                      cursor: "pointer",
                      filter: tx.isFlagged ? "none" : "grayscale(100%)",
                      opacity: tx.isFlagged ? 1 : 0.6,
                    }}
                    title={tx.isFlagged ? "Unflag Transaction" : "Flag Transaction"}
                  >
                    🚩
                  </span>
                </td>
                <td>
                  {tx.parsedDate
                    ? formatDate(tx.parsedDate)
                    : new Date(tx.date).toLocaleDateString()}
                </td>
                <td style={{ fontFamily: "monospace", fontSize: "11px", color: "#888" }}>{tx.id}</td>
                <td>{getAccountName(tx.from)}</td>
                <td>{tx.from}</td>
                <td>{getAccountName(tx.to)}</td>
                <td>{tx.to}</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(tx.amount)}</td>
                <td>{tx.type}</td>
                <td>{tx.description}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div id="paginationControls">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          title="Previous Page"
        >
          &lt; Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          title="Next Page"
        >
          Next &gt;
        </button>
      </div>
    </>
  );
};

export default TransactionsTable;
