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
  const getAccountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name || id;

  return (
    <>
      <h4>Displayed Transactions</h4>
      <table>
        <thead>
          <tr>
            <th style={{ width: '20px' }}></th>
            <th>Date</th>
            <th>From</th>
            <th>From #</th>
            <th>To</th>
            <th>To #</th>
            <th>Amount</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={9}>No transactions found.</td>
            </tr>
          ) : (
            transactions.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <span 
                    onClick={() => onToggleFlag(tx.id)} 
                    style={{
                      cursor: 'pointer',
                      filter: tx.isFlagged ? 'none' : 'grayscale(100%)',
                      opacity: tx.isFlagged ? 1 : 0.6,
                    }}
                    title={tx.isFlagged ? 'Unflag Transaction' : 'Flag Transaction'}
                  >
                    🚩
                  </span>
                </td>
                <td>
                  {tx.parsedDate
                    ? formatDate(tx.parsedDate)
                    : new Date(tx.date).toLocaleDateString()}
                </td>
                <td>{getAccountName(tx.from)}</td>
                <td>{tx.from}</td>
                <td>{getAccountName(tx.to)}</td>
                <td>{tx.to}</td>
                <td>{formatCurrency(tx.amount)}</td>
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
