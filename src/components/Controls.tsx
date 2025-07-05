import React from "react";
import type { Account } from "../data";
import DualRangeSlider from "./DualRangeSlider";
import "../App.css";

export interface Filters {
  amountRange?: [number, number];
  flowRange?: [number, number];
}

export interface ControlsProps {
  filters: Filters;
  accounts: Account[];
  onFilterChange: (newFilters: Partial<Filters>) => void;
  transactions?: Array<{ amount: number; parsedDate?: Date }> ;
  accountFlows?: Record<string, number>;
}

const Controls: React.FC<ControlsProps> = ({ filters, onFilterChange, transactions = [], accountFlows = {} }) => {
  // Compute min/max for amount slider
  const [minAmount, maxAmount] = React.useMemo(() => {
    if (!transactions.length) return [0, 10000];
    const vals = transactions.map((t) => t.amount);
    return [Math.min(...vals), Math.max(...vals)];
  }, [transactions]);
  
  // Compute min/max for flow slider
  const [minFlow, maxFlow] = React.useMemo(() => {
    const vals = Object.values(accountFlows).map(Math.abs);
    if (!vals.length) return [0, 10000];
    return [0, Math.max(...vals)]; // Always start at 0
  }, [accountFlows]);

  const currentAmountRange = filters.amountRange || [minAmount, maxAmount];
  const currentFlowRange = filters.flowRange || [minFlow, maxFlow];

  return (
    <>
      {/* Amount slider */}
      <DualRangeSlider
        min={minAmount}
        max={maxAmount}
        value={currentAmountRange}
        onChange={(range) => onFilterChange({ amountRange: range })}
        label="Transaction Amount"
        formatValue={(val) => `$${Math.round(val).toLocaleString()}`}
      />

      {/* Flow slider */}
      <DualRangeSlider
        min={minFlow}
        max={maxFlow}
        value={currentFlowRange}
        onChange={(range) => onFilterChange({ flowRange: range })}
        label="Account Flow"
        formatValue={(val) => `$${Math.round(val).toLocaleString()}`}
      />
    </>
  );
};

export default Controls;
