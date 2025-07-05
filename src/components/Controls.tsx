import React from "react";
import type { Account } from "../data";
import DualRangeSlider from "./DualRangeSlider";
import "../App.css";

export interface Filters {
  dateRange: { from: Date | null; to: Date | null };
  amountRange?: [number, number];
  flowRange?: [number, number];
}

export interface ControlsProps {
  filters: Filters;
  accounts: Account[];
  onFilterChange: (newFilters: Partial<Filters>) => void;
  transactions?: any[];
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
    const vals = Object.values(accountFlows);
    if (!vals.length) return [0, 10000];
    return [Math.min(...vals), Math.max(...vals)];
  }, [accountFlows]);

  // Compute min/max dates for date slider
  const [minDate, maxDate] = React.useMemo(() => {
    if (!transactions.length) return [new Date('2024-01-01'), new Date('2024-12-31')];
    const dates = transactions.map(t => t.parsedDate).filter(Boolean);
    return [new Date(Math.min(...dates)), new Date(Math.max(...dates))];
  }, [transactions]);

  const currentAmountRange = filters.amountRange || [minAmount, maxAmount];
  const currentFlowRange = filters.flowRange || [minFlow, maxFlow];
  const currentDateRange: [number, number] = [
    filters.dateRange.from?.getTime() || minDate.getTime(),
    filters.dateRange.to?.getTime() || maxDate.getTime()
  ];

  return (
    <>
      <DualRangeSlider
        min={minDate.getTime()}
        max={maxDate.getTime()}
        value={currentDateRange}
        onChange={([from, to]) => onFilterChange({
          dateRange: {
            from: new Date(from),
            to: new Date(to)
          }
        })}
        label="Date Range"
        formatValue={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      />
      
      <DualRangeSlider
        min={minAmount}
        max={maxAmount}
        value={currentAmountRange}
        onChange={(range) => onFilterChange({ amountRange: range })}
        label="Transaction Amount"
        formatValue={(val) => `$${Math.round(val).toLocaleString()}`}
      />

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
