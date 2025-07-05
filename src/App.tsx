import React, { useState, useMemo, useRef } from "react";
import Chart from "./components/Chart";
import Controls from "./components/Controls";
import TransactionsTable from "./components/TransactionsTable";
import Tooltip from "./components/Tooltip";
import TreeGraph from "./components/TreeGraph";
import TimeFlow from "./components/TimeFlow";
import { rawTransactionsData, accounts, parseDate } from "./data";
import type { Transaction } from "./data";
import "./App.css";

// Remove dateRange from Filters type
interface Filters {
  amountRange?: [number, number];
  flowRange?: [number, number];
}

// Filter and pagination types
const PAGE_SIZE = 10;

function App() {
  // Tooltip state and logic
  const [tooltip, setTooltip] = useState<{ 
    visible: boolean; 
    x: number; 
    y: number; 
    content: React.ReactNode 
  }>({ visible: false, x: 0, y: 0, content: null });
  const tooltipTimeoutRef = useRef<number | null>(null);

  const handleShowTooltip = (content: React.ReactNode, x: number, y: number) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setTooltip({ visible: true, content, x, y });
  };

  const handleHideTooltip = () => {
    tooltipTimeoutRef.current = window.setTimeout(() => {
      setTooltip({ visible: false, x: 0, y: 0, content: null });
    }, 100); // 100ms delay to allow moving into the tooltip
  };

  // Main state
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const [visualization, setVisualization] = useState<'flow' | 'tree' | 'timeflow'>("flow");

  const [transactions, setTransactions] = useState(() =>
    rawTransactionsData.map((tx) => ({
      ...tx,
      parsedDate: parseDate(tx.date) || undefined,
      isFlagged: tx.isFlagged || false, // Initialize isFlagged
    }))
  );

  const [visibleTransactions, setVisibleTransactions] = useState<Transaction[]>([]); // Holds visible txns in chart
  const [activeAccounts, setActiveAccounts] = useState<string[]>([accounts[0]?.id]); // Start with first account

  const handleToggleFlag = (id: string) => {
    setTransactions(currentTransactions =>
      currentTransactions.map(tx =>
        tx.id === id ? { ...tx, isFlagged: !tx.isFlagged } : tx
      )
    );
  };

  // Compute pairwise flows for flow filter
  const pairFlows = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(tx => {
      const key = [tx.from, tx.to].sort().join("|");
      map.set(key, (map.get(key) || 0) + Math.abs(tx.amount));
    });
    return map;
  }, [transactions]);

  // Convert pairFlows to object for Controls
  const pairFlowsObj = useMemo(() => {
    const obj: Record<string, number> = {};
    pairFlows.forEach((v, k) => { obj[k] = v; });
    return obj;
  }, [pairFlows]);

  // Filtered transactions (add amount and flow filters)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filters.amountRange && (tx.amount < filters.amountRange[0] || tx.amount > filters.amountRange[1])) return false;
      if (filters.flowRange) {
        // Only show tx if the total flow between the two accounts is in range
        const key = [tx.from, tx.to].sort().join("|");
        const pairFlow = pairFlows.get(key) || 0;
        if (pairFlow < filters.flowRange[0] || pairFlow > filters.flowRange[1]) return false;
      }
      return true;
    });
  }, [transactions, filters, pairFlows]);

  // Only show transactions involving any active account
  const activeFilteredTransactions = useMemo(() => {
    return filteredTransactions.filter((tx) => {
      return activeAccounts.includes(tx.from) || activeAccounts.includes(tx.to);
    });
  }, [filteredTransactions, activeAccounts]);

  // Pagination (now based on visibleTransactions)
  const totalPages = Math.ceil(visibleTransactions.length / PAGE_SIZE);
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return visibleTransactions.slice(start, start + PAGE_SIZE);
  }, [visibleTransactions, page]);

  // Handlers
  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };
  const handlePageChange = (newPage: number) => setPage(newPage);

  // Get stable min/max for amount range for TreeGraph (based on all transactions, not filtered)
  const [minAmount, maxAmount] = useMemo(() => {
    if (!transactions.length) return [0, 10000];
    const vals = transactions.map((t) => t.amount);
    return [Math.min(...vals), Math.max(...vals)];
  }, [transactions]);

  // Handler for changing active account from TreeGraph
  const handleActiveAccountChange = (accountId: string) => {
    setActiveAccounts([accountId]);
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">Transaction Visualiser</h1>
      </header>
      
      <div className="controls-panel">
        <div className="controls-grid">
          <Controls
            filters={filters}
            accounts={accounts}
            onFilterChange={handleFilterChange}
            onResetFlags={() => {
              setTransactions(currentTransactions =>
                currentTransactions.map(tx => ({ ...tx, isFlagged: false }))
              );
            }}
            transactions={transactions}
            accountFlows={pairFlowsObj}
          />
          <div style={{ marginLeft: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="viz-mode">View:</label>
            <select
              id="viz-mode"
              value={visualization}
              onChange={e => setVisualization(e.target.value as 'flow' | 'tree' | 'timeflow')}
              style={{ fontSize: 14, padding: '2px 8px' }}
            >
              <option value="flow">Flow Chart</option>
              <option value="tree">Tree Graph</option>
              <option value="timeflow">Time Flow</option>
            </select>
          </div>
        </div>
      </div>

      <div className="chart-section">
        {visualization === 'flow' ? (
          <Chart
            transactions={activeFilteredTransactions}
            accounts={accounts}
            onShowTooltip={handleShowTooltip}
            onHideTooltip={handleHideTooltip}
            onToggleFlag={handleToggleFlag}
            onVisibleTransactionsChange={setVisibleTransactions}
            onResetFlags={() => {
              setTransactions(currentTransactions =>
                currentTransactions.map(tx => ({ ...tx, isFlagged: false }))
              );
            }}
            activeAccounts={activeAccounts}
            onAddActiveAccount={(id) => setActiveAccounts((prev) => prev.includes(id) ? prev : [...prev, id])}
          />
        ) : visualization === 'tree' ? (
          <TreeGraph
            transactions={filteredTransactions}
            activeAccount={activeAccounts[0]}
            minAmount={filters.amountRange?.[0] || minAmount}
            maxAmount={filters.amountRange?.[1] || maxAmount}
            onActiveAccountChange={handleActiveAccountChange}
          />
        ) : (
          <TimeFlow
            transactions={filteredTransactions}
            allTransactions={transactions}
            minAmount={filters.amountRange?.[0] || minAmount}
            maxAmount={filters.amountRange?.[1] || maxAmount}
            onToggleFlag={handleToggleFlag}
          />
        )}
      </div>

      <div className="table-section">
        {visualization === 'flow' && (
          <div className="grid-container">
            <TransactionsTable
              transactions={paginatedTransactions}
              accounts={accounts}
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onToggleFlag={handleToggleFlag}
            />
          </div>
        )}
      </div>

      <Tooltip 
        {...tooltip} 
        onMouseEnter={() => {
          if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
          }
        }}
        onMouseLeave={handleHideTooltip}
      />
    </div>
  );
}

export default App;
