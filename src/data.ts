// Configuration, formatters, and sample data for the transaction visualizer

export const config = {
  datePaddingDays: 2,
  weekPaddingDays: 7,
  monthPaddingDays: 15,
  arrowOffsetMm: 5,
  dayOffsetMm: 1.5,
  badgePaddingX: 3,
  badgePaddingY: 1.5,
  transactionTypeColors: {
    DEFT: "#3b82f6",
    CASH: "#f59e0b",
    IMT: "#8b5cf6",
    Card: "#10b981",
    Other: "#6b7280",
  },
  labelAmountBracketColors: ["#FFE0B2", "#FFCC80", "#FFA07A", "#F08080"],
  defaultArrowColor: "#6b7280",
  normalArrowThickness: 1.5,
};

import * as d3 from "d3";

export const parseDate = d3.timeParse("%Y-%m-%d");
export const formatDate = d3.timeFormat("%d/%m/%Y");
export const formatXAxisDate = d3.timeFormat("%d/%m");
export const formatCurrency = (value: number) => {
  if (value === undefined || value === null || isNaN(value)) return "N/A";
  return Number(value).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
};
export const formatCurrencyShort = (value: number) => {
  if (value === undefined || value === null || isNaN(value)) return "N/A";
  if (value >= 1000000) {
    return "$" + (value / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (value >= 1000) {
    return "$" + (value / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return "$" + value.toFixed(0);
};

export interface Transaction {
  id: string;
  date: string;
  from: string;
  to: string;
  amount: number;
  type: string;
  description?: string;
  parsedDate?: Date;
  isFlagged?: boolean;
}

export interface Account {
  id: string;
  name: string;
}

export const rawTransactionsData: Transaction[] = [
  { date: "2024-07-02", from: "acc4", to: "acc1", amount: 400.0, type: "Card", description: "Test Aggregation 1", id: "tx-0" },
  { date: "2024-07-03", from: "acc4", to: "acc1", amount: 400.0, type: "Card", description: "Test Aggregation 2", id: "tx-1" },
  { date: "2024-07-04", from: "acc4", to: "acc1", amount: 400.0, type: "Card", description: "Test Aggregation 3", id: "tx-2" },
  { date: "2024-07-01", from: "acc1", to: "acc2", amount: 1500.75, type: "DEFT", description: "Salary Deposit - July", id: "tx-3" },
  { date: "2024-07-01", from: "acc2", to: "acc4", amount: 250.0, type: "DEFT", description: "Utility Bill Payment (Electricity)", id: "tx-4" },
  { date: "2024-07-01", from: "acc3", to: "acc1", amount: 7500.0, type: "IMT", description: "Offshore Funds - Part 1 (Home Savings)", id: "tx-5" },
  { date: "2024-07-03", from: "acc2", to: "acc1", amount: 12000.0, type: "DEFT", description: "Loan Repayment - Principal", id: "tx-6" },
  { date: "2024-07-04", from: "acc1", to: "acc4", amount: 75.5, type: "Card", description: "Groceries - Supermarket", id: "tx-7" },
  { date: "2024-07-05", from: "acc1", to: "acc3", amount: 9500.0, type: "CASH", description: "Cash Deposit - Branch", id: "tx-8" },
  { date: "2024-07-05", from: "acc2", to: "acc3", amount: 9200.0, type: "CASH", description: "Cash Transfer In - ATM", id: "tx-9" },
  { date: "2024-07-05", from: "acc4", to: "acc1", amount: 300.0, type: "Other", description: "Miscellaneous Transfer - Reimbursement", id: "tx-10" },
  { date: "2024-07-06", from: "acc4", to: "acc3", amount: 9800.0, type: "CASH", description: "Consulting Fee - Project Alpha", id: "tx-11" },
  { date: "2024-07-06", from: "acc1", to: "acc2", amount: 150.0, type: "Card", description: "Lunch Meeting - Client", id: "tx-12" },
  { date: "2024-07-07", from: "acc1", to: "acc3", amount: 9350.0, type: "CASH", description: "Payment Received - Invoice #123", id: "tx-13" },
  { date: "2024-07-07", from: "acc2", to: "acc3", amount: 9700.0, type: "IMT", description: "Service Charge - Monthly Fee", id: "tx-14" },
  { date: "2024-07-07", from: "acc4", to: "acc2", amount: 60.0, type: "Card", description: "Subscription - Streaming Service", id: "tx-15" },
  { date: "2024-07-08", from: "acc3", to: "acc4", amount: 25000.0, type: "DEFT", description: "Investment Transfer - Portfolio X", id: "tx-16" },
  { date: "2024-07-08", from: "acc1", to: "acc2", amount: 180.0, type: "Card", description: "Dinner - Restaurant", id: "tx-17" },
  { date: "2024-07-09", from: "acc2", to: "acc1", amount: 700.0, type: "DEFT", description: "Refund - Product Return", id: "tx-18" },
  { date: "2024-07-10", from: "acc3", to: "acc1", amount: 8000.0, type: "IMT", description: "Offshore Funds - Part 2 (Home Savings)", id: "tx-19" },
  { date: "2024-07-10", from: "acc4", to: "acc2", amount: 90.0, type: "Other", description: "Books - Academic Texts", id: "tx-20" },
  { date: "2024-07-15", from: "acc1", to: "acc4", amount: 120.0, type: "Card", description: "Fuel Purchase", id: "tx-21" },
  { date: "2024-07-15", from: "acc2", to: "acc1", amount: 5000.0, type: "DEFT", description: "Bonus Payment", id: "tx-22" },
  { date: "2024-07-20", from: "acc3", to: "acc1", amount: 6500.0, type: "IMT", description: "Offshore Funds - Part 3 (Home Savings)", id: "tx-23" },
  { date: "2024-07-25", from: "acc1", to: "acc2", amount: 300.0, type: "DEFT", description: "Rent Payment", id: "tx-24" },
  { date: "2024-08-01", from: "acc1", to: "acc2", amount: 1500.75, type: "DEFT", description: "Salary Deposit - August", id: "tx-25" },
  { date: "2024-08-01", from: "acc2", to: "acc4", amount: 260.0, type: "DEFT", description: "Utility Bill Payment (Gas)", id: "tx-26" },
  { date: "2024-08-01", from: "acc3", to: "acc1", amount: 7000.0, type: "IMT", description: "Offshore Funds - Part 4 (Home Savings)", id: "tx-27" },
  { date: "2024-08-02", from: "acc4", to: "acc1", amount: 75.0, type: "Card", description: "Coffee Shop Subscription", id: "tx-28" },
  { date: "2024-08-03", from: "acc1", to: "acc3", amount: 450.0, type: "CASH", description: "Cash Withdrawal - Personal", id: "tx-29" },
  { date: "2024-08-05", from: "acc2", to: "acc1", amount: 1000.0, type: "DEFT", description: "Project Milestone Payment", id: "tx-30" },
  { date: "2024-08-05", from: "acc1", to: "acc4", amount: 80.0, type: "Card", description: "Online Software Subscription", id: "tx-31" },
  { date: "2024-08-10", from: "acc3", to: "acc1", amount: 9000.0, type: "IMT", description: "Offshore Funds - Part 5 (Home Savings)", id: "tx-32" },
  { date: "2024-08-12", from: "acc4", to: "acc2", amount: 150.0, type: "Other", description: "Shared Expense Reimbursement", id: "tx-33" },
  { date: "2024-08-15", from: "acc1", to: "acc2", amount: 220.0, type: "Card", description: "Electronics Purchase", id: "tx-34" },
  { date: "2024-08-15", from: "acc2", to: "acc3", amount: 1200.0, type: "DEFT", description: "Investment Top-up", id: "tx-35" },
  { date: "2024-08-20", from: "acc3", to: "acc1", amount: 5000.0, type: "IMT", description: "Offshore Funds - Part 6 (Home Savings)", id: "tx-36" },
  { date: "2024-08-22", from: "acc1", to: "acc4", amount: 40.0, type: "Card", description: "Music Streaming Service", id: "tx-37" },
  { date: "2024-08-25", from: "acc1", to: "acc2", amount: 300.0, type: "DEFT", description: "Rent Payment", id: "tx-38" },
  { date: "2024-08-28", from: "acc2", to: "acc1", amount: 600.0, type: "DEFT", description: "Freelance Work Payment", id: "tx-39" },
  { date: "2024-09-01", from: "acc1", to: "acc2", amount: 1500.75, type: "DEFT", description: "Salary Deposit - September", id: "tx-40" },
  { date: "2024-09-01", from: "acc2", to: "acc4", amount: 240.0, type: "DEFT", description: "Utility Bill Payment (Water)", id: "tx-41" },
  { date: "2024-09-02", from: "acc3", to: "acc1", amount: 8500.0, type: "IMT", description: "Offshore Funds - Final Part (Home Savings)", id: "tx-42" },
  { date: "2024-09-03", from: "acc4", to: "acc1", amount: 95.0, type: "Card", description: "Gym Membership", id: "tx-43" },
  { date: "2024-09-05", from: "acc1", to: "acc4", amount: 50000.0, type: "DEFT", description: "Home Loan Down Payment - Property Purchase", id: "tx-44" },
  { date: "2024-09-05", from: "acc2", to: "acc3", amount: 300.0, type: "CASH", description: "Cash Transfer - Friend", id: "tx-45" },
  { date: "2024-09-07", from: "acc1", to: "acc2", amount: 120.0, type: "Card", description: "Weekend Groceries", id: "tx-46" },
  { date: "2024-09-10", from: "acc4", to: "acc1", amount: 200.0, type: "Other", description: "Gift Received", id: "tx-47" },
  { date: "2024-09-10", from: "acc2", to: "acc1", amount: 800.0, type: "DEFT", description: "Consulting Income", id: "tx-48" },
  { date: "2024-09-15", from: "acc1", to: "acc3", amount: 75.0, type: "Card", description: "Movie Tickets", id: "tx-49" },
  { date: "2024-09-15", from: "acc3", to: "acc2", amount: 1500.0, type: "IMT", description: "International Service Payment", id: "tx-50" },
  { date: "2024-09-20", from: "acc2", to: "acc4", amount: 500.0, type: "DEFT", description: "Car Repair Bill", id: "tx-51" },
  { date: "2024-09-25", from: "acc1", to: "acc2", amount: 300.0, type: "DEFT", description: "Rent Payment", id: "tx-52" },
  { date: "2024-09-28", from: "acc4", to: "acc1", amount: 100.0, type: "Card", description: "Book Purchase", id: "tx-53" },
  { date: "2024-09-30", from: "acc1", to: "acc2", amount: 50.0, type: "Other", description: "Miscellaneous Expense", id: "tx-54" },
];

export const accounts: Account[] = [
  { id: "acc1", name: "Nominee Account Alpha" },
  { id: "acc2", name: "Shell Corp Beta" },
  { id: "acc3", name: "Cash Business Gamma" },
  { id: "acc4", name: "Offshore Account Delta" },
];
