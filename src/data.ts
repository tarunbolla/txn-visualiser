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
  // Tree graph configuration
  treeGraph: {
    maxDepth: 8,          // Maximum depth for tree expansion (increased to show full laundering chain)
    maxChildrenPerNode: 12, // Maximum children per node to prevent overcrowding (increased for more visibility)
  },
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

export const accounts: Account[] = [
  { id: "A1001", name: "Alice Smith - Personal" },
  { id: "A1002", name: "Alice Smith - Savings" },
  { id: "B2001", name: "Bob Lee - Personal" },
  { id: "B2002", name: "Bob Lee - Savings" },
  { id: "C3001", name: "Carol Tan - Personal" },
  { id: "C3002", name: "Carol Tan - Savings" },
  { id: "EMP001", name: "Acme Corp Payroll" },
  { id: "SUP001", name: "Woolworths Supermarket" },
  { id: "UTIL001", name: "Sydney Utilities" },
  { id: "ELEC001", name: "JB Hi-Fi Electronics" },
  { id: "ATM001", name: "Westpac ATM 123" },
  { id: "SHELL1", name: "Shell Pty Ltd" },
  { id: "SHELL2", name: "Another Shell Co" },
  { id: "MULE1", name: "Mule Account" },
  { id: "MULE2", name: "Secondary Mule" },
  { id: "CAR001", name: "Luxury Car Dealer" },
  { id: "JEWL001", name: "Sydney Jewellers" },
  { id: "PROP001", name: "Real Estate Agency" },
  { id: "ART001", name: "Art Gallery" },
];

export const rawTransactionsData: Transaction[] = [
  // --- July Transactions ---
  { date: "2024-07-01", from: "EMP001", to: "A1001", amount: 7200, type: "DEFT", description: "Salary - Alice Smith", id: "tx-1" },
  { date: "2024-07-02", from: "EMP001", to: "B2001", amount: 7100, type: "DEFT", description: "Salary - Bob Lee", id: "tx-2" },
  { date: "2024-07-03", from: "EMP001", to: "C3001", amount: 7300, type: "DEFT", description: "Salary - Carol Tan", id: "tx-3" },
  { date: "2024-07-03", from: "A1001", to: "SUP001", amount: 91.2, type: "Card", description: "Groceries", id: "tx-4" },
  { date: "2024-07-04", from: "B2001", to: "SUP001", amount: 85.7, type: "Card", description: "Groceries", id: "tx-5" },
  { date: "2024-07-05", from: "C3001", to: "SUP001", amount: 82.1, type: "Card", description: "Groceries", id: "tx-6" },
  { date: "2024-07-04", from: "A1001", to: "UTIL001", amount: 127.0, type: "DEFT", description: "Electricity Bill", id: "tx-7" },
  { date: "2024-07-05", from: "B2001", to: "UTIL001", amount: 109.2, type: "DEFT", description: "Electricity Bill", id: "tx-8" },
  { date: "2024-07-06", from: "C3001", to: "UTIL001", amount: 123.8, type: "DEFT", description: "Electricity Bill", id: "tx-9" },
  { date: "2024-07-06", from: "A1001", to: "ELEC001", amount: 241.0, type: "Card", description: "Electronics Purchase", id: "tx-10" },
  { date: "2024-07-07", from: "B2001", to: "ELEC001", amount: 194.2, type: "Card", description: "Electronics Purchase", id: "tx-11" },
  { date: "2024-07-08", from: "C3001", to: "ELEC001", amount: 202.5, type: "Card", description: "Electronics Purchase", id: "tx-12" },
  // Structuring: own accounts
  { date: "2024-07-07", from: "A1001", to: "A1002", amount: 4200, type: "CASH", description: "Savings Transfer", id: "tx-13" },
  { date: "2024-07-08", from: "B2001", to: "B2002", amount: 4300, type: "CASH", description: "Savings Transfer", id: "tx-14" },
  { date: "2024-07-09", from: "C3001", to: "C3002", amount: 4400, type: "CASH", description: "Savings Transfer", id: "tx-15" },
  // Structuring: cross-person
  { date: "2024-07-10", from: "A1002", to: "B2002", amount: 4100, type: "CASH", description: "Split Transfer", id: "tx-16" },
  { date: "2024-07-10", from: "B2002", to: "C3002", amount: 4200, type: "CASH", description: "Split Transfer", id: "tx-17" },
  { date: "2024-07-11", from: "C3002", to: "A1002", amount: 4300, type: "CASH", description: "Split Transfer", id: "tx-18" },
  { date: "2024-07-12", from: "A1001", to: "SUP001", amount: 66.0, type: "Card", description: "Groceries", id: "tx-19" },
  { date: "2024-07-13", from: "B2001", to: "SUP001", amount: 74.2, type: "Card", description: "Groceries", id: "tx-20" },
  { date: "2024-07-13", from: "C3001", to: "SUP001", amount: 61.8, type: "Card", description: "Groceries", id: "tx-21" },
  { date: "2024-07-14", from: "A1001", to: "ATM001", amount: 312.0, type: "CASH", description: "ATM Withdrawal", id: "tx-22" },
  { date: "2024-07-15", from: "B2001", to: "ATM001", amount: 285.0, type: "CASH", description: "ATM Withdrawal", id: "tx-23" },
  { date: "2024-07-15", from: "C3001", to: "ATM001", amount: 318.0, type: "CASH", description: "ATM Withdrawal", id: "tx-24" },
  { date: "2024-07-16", from: "A1002", to: "C3002", amount: 540, type: "CASH", description: "Split Transfer", id: "tx-25" },
  { date: "2024-07-16", from: "B2002", to: "A1002", amount: 470, type: "CASH", description: "Split Transfer", id: "tx-26" },
  { date: "2024-07-17", from: "C3002", to: "B2002", amount: 510, type: "CASH", description: "Split Transfer", id: "tx-27" },
  { date: "2024-07-18", from: "A1001", to: "UTIL001", amount: 104.0, type: "DEFT", description: "Water Bill", id: "tx-28" },
  { date: "2024-07-18", from: "B2001", to: "UTIL001", amount: 120.0, type: "DEFT", description: "Water Bill", id: "tx-29" },
  { date: "2024-07-19", from: "C3001", to: "UTIL001", amount: 119.0, type: "DEFT", description: "Water Bill", id: "tx-30" },
  { date: "2024-07-20", from: "A1001", to: "UTIL001", amount: 101.0, type: "DEFT", description: "Gas Bill", id: "tx-31" },
  { date: "2024-07-20", from: "B2001", to: "UTIL001", amount: 93.0, type: "DEFT", description: "Gas Bill", id: "tx-32" },
  { date: "2024-07-21", from: "C3001", to: "UTIL001", amount: 102.0, type: "DEFT", description: "Gas Bill", id: "tx-33" },
  { date: "2024-07-22", from: "A1001", to: "UTIL001", amount: 65.0, type: "DEFT", description: "Internet Bill", id: "tx-34" },
  { date: "2024-07-22", from: "B2001", to: "UTIL001", amount: 58.0, type: "DEFT", description: "Internet Bill", id: "tx-35" },
  { date: "2024-07-23", from: "C3001", to: "UTIL001", amount: 67.0, type: "DEFT", description: "Internet Bill", id: "tx-36" },
  { date: "2024-07-24", from: "A1001", to: "UTIL001", amount: 41.0, type: "DEFT", description: "Phone Bill", id: "tx-37" },
  { date: "2024-07-24", from: "B2001", to: "UTIL001", amount: 48.0, type: "DEFT", description: "Phone Bill", id: "tx-38" },
  { date: "2024-07-25", from: "C3001", to: "UTIL001", amount: 44.0, type: "DEFT", description: "Phone Bill", id: "tx-39" },
  { date: "2024-07-26", from: "A1001", to: "UTIL001", amount: 28.0, type: "DEFT", description: "Streaming Service", id: "tx-40" },
  { date: "2024-07-26", from: "B2001", to: "UTIL001", amount: 33.0, type: "DEFT", description: "Streaming Service", id: "tx-41" },
  { date: "2024-07-27", from: "C3001", to: "UTIL001", amount: 29.0, type: "DEFT", description: "Streaming Service", id: "tx-42" },

  // --- August Transactions ---
  // Salary credits
  { date: "2024-08-01", from: "EMP001", to: "A1001", amount: 7200, type: "DEFT", description: "Salary - Alice Smith", id: "tx-43" },
  { date: "2024-08-01", from: "EMP001", to: "B2001", amount: 7100, type: "DEFT", description: "Salary - Bob Lee", id: "tx-44" },
  { date: "2024-08-01", from: "EMP001", to: "C3001", amount: 7300, type: "DEFT", description: "Salary - Carol Tan", id: "tx-45" },
  // Daily expenses
  { date: "2024-08-02", from: "A1001", to: "SUP001", amount: 88.0, type: "Card", description: "Groceries", id: "tx-46" },
  { date: "2024-08-02", from: "B2001", to: "SUP001", amount: 90.0, type: "Card", description: "Groceries", id: "tx-47" },
  { date: "2024-08-02", from: "C3001", to: "SUP001", amount: 80.0, type: "Card", description: "Groceries", id: "tx-48" },
  { date: "2024-08-03", from: "A1001", to: "UTIL001", amount: 122.0, type: "DEFT", description: "Electricity Bill", id: "tx-49" },
  { date: "2024-08-03", from: "B2001", to: "UTIL001", amount: 117.0, type: "DEFT", description: "Electricity Bill", id: "tx-50" },
  { date: "2024-08-03", from: "C3001", to: "UTIL001", amount: 120.0, type: "DEFT", description: "Electricity Bill", id: "tx-51" },
  { date: "2024-08-04", from: "A1001", to: "ELEC001", amount: 260.0, type: "Card", description: "Electronics Purchase", id: "tx-52" },
  { date: "2024-08-04", from: "B2001", to: "ELEC001", amount: 185.0, type: "Card", description: "Electronics Purchase", id: "tx-53" },
  { date: "2024-08-04", from: "C3001", to: "ELEC001", amount: 215.0, type: "Card", description: "Electronics Purchase", id: "tx-54" },
  // Structuring: own accounts
  { date: "2024-08-05", from: "A1001", to: "A1002", amount: 4200, type: "CASH", description: "Savings Transfer", id: "tx-55" },
  { date: "2024-08-05", from: "B2001", to: "B2002", amount: 4300, type: "CASH", description: "Savings Transfer", id: "tx-56" },
  { date: "2024-08-05", from: "C3001", to: "C3002", amount: 4400, type: "CASH", description: "Savings Transfer", id: "tx-57" },
  // Structuring: cross-person
  { date: "2024-08-06", from: "A1002", to: "B2002", amount: 4100, type: "CASH", description: "Split Transfer", id: "tx-58" },
  { date: "2024-08-06", from: "B2002", to: "C3002", amount: 4200, type: "CASH", description: "Split Transfer", id: "tx-59" },
  { date: "2024-08-06", from: "C3002", to: "A1002", amount: 4300, type: "CASH", description: "Split Transfer", id: "tx-60" },
  // More daily expenses
  { date: "2024-08-07", from: "A1001", to: "SUP001", amount: 62.0, type: "Card", description: "Groceries", id: "tx-61" },
  { date: "2024-08-07", from: "B2001", to: "SUP001", amount: 68.0, type: "Card", description: "Groceries", id: "tx-62" },
  { date: "2024-08-07", from: "C3001", to: "SUP001", amount: 67.0, type: "Card", description: "Groceries", id: "tx-63" },
  { date: "2024-08-08", from: "A1001", to: "ATM001", amount: 310.0, type: "CASH", description: "ATM Withdrawal", id: "tx-64" },
  { date: "2024-08-08", from: "B2001", to: "ATM001", amount: 320.0, type: "CASH", description: "ATM Withdrawal", id: "tx-65" },
  { date: "2024-08-08", from: "C3001", to: "ATM001", amount: 305.0, type: "CASH", description: "ATM Withdrawal", id: "tx-66" },
  // Structuring: more cross-person
  { date: "2024-08-09", from: "A1002", to: "C3002", amount: 4100, type: "CASH", description: "Split Transfer", id: "tx-67" },
  { date: "2024-08-09", from: "B2002", to: "A1002", amount: 4200, type: "CASH", description: "Split Transfer", id: "tx-68" },
  { date: "2024-08-09", from: "C3002", to: "B2002", amount: 4300, type: "CASH", description: "Split Transfer", id: "tx-69" },
  // More daily expenses
  { date: "2024-08-10", from: "A1001", to: "UTIL001", amount: 112.0, type: "DEFT", description: "Water Bill", id: "tx-70" },
  { date: "2024-08-10", from: "B2001", to: "UTIL001", amount: 115.0, type: "DEFT", description: "Water Bill", id: "tx-71" },
  { date: "2024-08-10", from: "C3001", to: "UTIL001", amount: 117.0, type: "DEFT", description: "Water Bill", id: "tx-72" },
  // More utility transactions
  { date: "2024-08-11", from: "A1001", to: "UTIL001", amount: 97.0, type: "DEFT", description: "Gas Bill", id: "tx-73" },
  { date: "2024-08-11", from: "B2001", to: "UTIL001", amount: 99.0, type: "DEFT", description: "Gas Bill", id: "tx-74" },
  { date: "2024-08-11", from: "C3001", to: "UTIL001", amount: 98.0, type: "DEFT", description: "Gas Bill", id: "tx-75" },
  { date: "2024-08-12", from: "A1001", to: "UTIL001", amount: 62.0, type: "DEFT", description: "Internet Bill", id: "tx-76" },
  { date: "2024-08-12", from: "B2001", to: "UTIL001", amount: 62.0, type: "DEFT", description: "Internet Bill", id: "tx-77" },
  { date: "2024-08-12", from: "C3001", to: "UTIL001", amount: 62.0, type: "DEFT", description: "Internet Bill", id: "tx-78" },
  { date: "2024-08-13", from: "A1001", to: "UTIL001", amount: 47.0, type: "DEFT", description: "Phone Bill", id: "tx-79" },
  { date: "2024-08-13", from: "B2001", to: "UTIL001", amount: 47.0, type: "DEFT", description: "Phone Bill", id: "tx-80" },
  { date: "2024-08-13", from: "C3001", to: "UTIL001", amount: 47.0, type: "DEFT", description: "Phone Bill", id: "tx-81" },
  { date: "2024-08-14", from: "A1001", to: "UTIL001", amount: 32.0, type: "DEFT", description: "Streaming Service", id: "tx-82" },
  { date: "2024-08-14", from: "B2001", to: "UTIL001", amount: 32.0, type: "DEFT", description: "Streaming Service", id: "tx-83" },
  { date: "2024-08-14", from: "C3001", to: "UTIL001", amount: 32.0, type: "DEFT", description: "Streaming Service", id: "tx-84" },

  // --- September Transactions ---
  // Salary credits
  { date: "2024-09-01", from: "EMP001", to: "A1001", amount: 7200, type: "DEFT", description: "Salary - Alice Smith", id: "tx-85" },
  { date: "2024-09-01", from: "EMP001", to: "B2001", amount: 7100, type: "DEFT", description: "Salary - Bob Lee", id: "tx-86" },
  { date: "2024-09-01", from: "EMP001", to: "C3001", amount: 7300, type: "DEFT", description: "Salary - Carol Tan", id: "tx-87" },
  // Daily expenses
  { date: "2024-09-02", from: "A1001", to: "SUP001", amount: 86.0, type: "Card", description: "Groceries", id: "tx-88" },
  { date: "2024-09-02", from: "B2001", to: "SUP001", amount: 91.0, type: "Card", description: "Groceries", id: "tx-89" },
  { date: "2024-09-02", from: "C3001", to: "SUP001", amount: 79.0, type: "Card", description: "Groceries", id: "tx-90" },
  { date: "2024-09-03", from: "A1001", to: "UTIL001", amount: 121.0, type: "DEFT", description: "Electricity Bill", id: "tx-91" },
  { date: "2024-09-03", from: "B2001", to: "UTIL001", amount: 116.0, type: "DEFT", description: "Electricity Bill", id: "tx-92" },
  { date: "2024-09-03", from: "C3001", to: "UTIL001", amount: 119.0, type: "DEFT", description: "Electricity Bill", id: "tx-93" },
  { date: "2024-09-04", from: "A1001", to: "ELEC001", amount: 255.0, type: "Card", description: "Electronics Purchase", id: "tx-94" },
  { date: "2024-09-04", from: "B2001", to: "ELEC001", amount: 182.0, type: "Card", description: "Electronics Purchase", id: "tx-95" },
  { date: "2024-09-04", from: "C3001", to: "ELEC001", amount: 212.0, type: "Card", description: "Electronics Purchase", id: "tx-96" },
  // Structuring: own accounts
  { date: "2024-09-05", from: "A1001", to: "A1002", amount: 4200, type: "CASH", description: "Savings Transfer", id: "tx-97" },
  { date: "2024-09-05", from: "B2001", to: "B2002", amount: 4300, type: "CASH", description: "Savings Transfer", id: "tx-98" },
  { date: "2024-09-05", from: "C3001", to: "C3002", amount: 4400, type: "CASH", description: "Savings Transfer", id: "tx-99" },
  // Structuring: cross-person
  { date: "2024-09-06", from: "A1002", to: "B2002", amount: 4100, type: "CASH", description: "Split Transfer", id: "tx-100" },
  { date: "2024-09-06", from: "B2002", to: "C3002", amount: 4200, type: "CASH", description: "Split Transfer", id: "tx-101" },
  { date: "2024-09-06", from: "C3002", to: "A1002", amount: 4300, type: "CASH", description: "Split Transfer", id: "tx-102" },
  // Structuring: more cross-person
  { date: "2024-09-09", from: "A1002", to: "C3002", amount: 4100, type: "CASH", description: "Split Transfer", id: "tx-109" },
  { date: "2024-09-09", from: "B2002", to: "A1002", amount: 4200, type: "CASH", description: "Split Transfer", id: "tx-110" },
  { date: "2024-09-09", from: "C3002", to: "B2002", amount: 4300, type: "CASH", description: "Split Transfer", id: "tx-111" },
  // More daily expenses
  { date: "2024-09-10", from: "A1001", to: "UTIL001", amount: 113.0, type: "DEFT", description: "Water Bill", id: "tx-112" },
  { date: "2024-09-10", from: "B2001", to: "UTIL001", amount: 114.0, type: "DEFT", description: "Water Bill", id: "tx-113" },
  { date: "2024-09-10", from: "C3001", to: "UTIL001", amount: 116.0, type: "DEFT", description: "Water Bill", id: "tx-114" },
  // More utility transactions
  { date: "2024-09-11", from: "A1001", to: "UTIL001", amount: 96.0, type: "DEFT", description: "Gas Bill", id: "tx-115" },
  { date: "2024-09-11", from: "B2001", to: "UTIL001", amount: 97.0, type: "DEFT", description: "Gas Bill", id: "tx-116" },
  { date: "2024-09-11", from: "C3001", to: "UTIL001", amount: 99.0, type: "DEFT", description: "Gas Bill", id: "tx-117" },
  { date: "2024-09-12", from: "A1001", to: "UTIL001", amount: 61.0, type: "DEFT", description: "Internet Bill", id: "tx-118" },
  { date: "2024-09-12", from: "B2001", to: "UTIL001", amount: 61.0, type: "DEFT", description: "Internet Bill", id: "tx-119" },
  { date: "2024-09-12", from: "C3001", to: "UTIL001", amount: 61.0, type: "DEFT", description: "Internet Bill", id: "tx-120" },
  { date: "2024-09-13", from: "A1001", to: "UTIL001", amount: 46.0, type: "DEFT", description: "Phone Bill", id: "tx-121" },
  { date: "2024-09-13", from: "B2001", to: "UTIL001", amount: 46.0, type: "DEFT", description: "Phone Bill", id: "tx-122" },
  { date: "2024-09-13", from: "C3001", to: "UTIL001", amount: 46.0, type: "DEFT", description: "Phone Bill", id: "tx-123" },
  { date: "2024-09-14", from: "A1001", to: "UTIL001", amount: 31.0, type: "DEFT", description: "Streaming Service", id: "tx-124" },
  { date: "2024-09-14", from: "B2001", to: "UTIL001", amount: 31.0, type: "DEFT", description: "Streaming Service", id: "tx-125" },
  { date: "2024-09-14", from: "C3001", to: "UTIL001", amount: 31.0, type: "DEFT", description: "Streaming Service", id: "tx-126" },

  // --- Money Laundering Simulation (September) ---
  // Step 1: Large cash deposit (placement)
  { date: "2024-09-15", from: "ATM001", to: "A1001", amount: 25000, type: "CASH", description: "Large Cash Deposit (Placement)", id: "tx-ML1" },
  // Step 2: Layering - rapid transfers through savings, shell, mule
  { date: "2024-09-15", from: "A1001", to: "A1002", amount: 12400, type: "CASH", description: "Layering Transfer 1", id: "tx-ML2" },
  { date: "2024-09-15", from: "A1002", to: "SHELL1", amount: 12300, type: "IMT", description: "Layering Transfer 2 (to Shell)", id: "tx-ML3" },
  { date: "2024-09-16", from: "SHELL1", to: "MULE1", amount: 12200, type: "IMT", description: "Layering Transfer 3 (to Mule)", id: "tx-ML4" },
  // Extended layering chain
  { date: "2024-09-16", from: "MULE1", to: "SHELL2", amount: 6000, type: "IMT", description: "Layering Transfer 4 (to Shell 2)", id: "tx-ML4a" },
  { date: "2024-09-16", from: "SHELL2", to: "MULE2", amount: 5900, type: "IMT", description: "Layering Transfer 5 (to Mule 2)", id: "tx-ML4b" },
  // Step 3: Integration - high-value purchases through multiple channels
  { date: "2024-09-17", from: "MULE1", to: "CAR001", amount: 6000, type: "DEFT", description: "Luxury Car Purchase (Integration)", id: "tx-ML5" },
  { date: "2024-09-17", from: "CAR001", to: "PROP001", amount: 5800, type: "DEFT", description: "Property Investment (Integration)", id: "tx-ML5a" },
  { date: "2024-09-18", from: "MULE2", to: "JEWL001", amount: 3000, type: "DEFT", description: "Jewelry Purchase (Integration)", id: "tx-ML6" },
  { date: "2024-09-18", from: "JEWL001", to: "ART001", amount: 2800, type: "DEFT", description: "Art Purchase (Integration)", id: "tx-ML6a" },
  // Additional structuring 
  { date: "2024-09-19", from: "MULE2", to: "A1001", amount: 2800, type: "IMT", description: "Return Transfer (Layering)", id: "tx-ML7" },
];
