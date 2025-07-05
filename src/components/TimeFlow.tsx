import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { accounts, formatCurrencyShort, formatDate } from "../data";
import type { Transaction } from "../data";
import TransactionsTable from "./TransactionsTable";

interface TimeFlowProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  minAmount: number;
  maxAmount: number;
  onToggleFlag: (id: string) => void;
}

interface FlowBand {
  id: string;
  fromAccount: string;
  toAccount: string;
  date: Date;
  amount: number;
  transactions: Transaction[];
}

interface AccountLane {
  id: string;
  name: string;
  y: number;
  totalVolume: number;
}

const TimeFlow: React.FC<TimeFlowProps> = ({ 
  transactions, 
  allTransactions, 
  minAmount, 
  maxAmount, 
  onToggleFlag 
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const dimensionsRef = useRef<{ width: number; height: number } | null>(null);
  
  // State for selected flow band and its transactions
  const [selectedFlow, setSelectedFlow] = useState<{
    transactions: Transaction[];
    fromAccount: string;
    toAccount: string;
    date: Date;
    amount: number;
  } | null>(null);

  // Initialize zoom behavior once
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Calculate and store fixed dimensions
    const containerRect = containerRef.current.getBoundingClientRect();
    const WIDTH = Math.floor(containerRect.width * 0.95);
    const HEIGHT = 600; // Taller for account lanes
    
    // Store dimensions for consistent use
    dimensionsRef.current = { width: WIDTH, height: HEIGHT };
    
    const svg = d3.select(svgRef.current);
    svg.attr("width", WIDTH).attr("height", HEIGHT);
    
    // Create main group for zoom/pan
    const g = svg.append("g");
    gRef.current = g;

    // Add zoom behavior (horizontal scrolling for time)
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom as any);
    
    // Cleanup function
    return () => {
      svg.selectAll("*").remove();
      zoomRef.current = null;
      gRef.current = null;
      dimensionsRef.current = null;
    };
  }, []);

  // Update content when transactions change
  useEffect(() => {
    if (!containerRef.current || !gRef.current || !dimensionsRef.current) return;
    
    const { width: WIDTH, height: HEIGHT } = dimensionsRef.current;
    const g = gRef.current;
    
    // Filter transactions by amount
    const filteredTx = transactions.filter(
      (tx) => tx.amount >= minAmount && tx.amount <= maxAmount && tx.parsedDate
    );
    
    if (filteredTx.length === 0) {
      g.selectAll("*").remove();
      return;
    }

    // Get date range
    const dates = filteredTx.map(tx => tx.parsedDate!);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add padding to date range
    const timeRange = maxDate.getTime() - minDate.getTime();
    const paddedMinDate = new Date(minDate.getTime() - timeRange * 0.05);
    const paddedMaxDate = new Date(maxDate.getTime() + timeRange * 0.05);
    
    // Create time scale
    const margin = { top: 50, right: 50, bottom: 50, left: 200 };
    const timeScale = d3.scaleTime()
      .domain([paddedMinDate, paddedMaxDate])
      .range([margin.left, WIDTH - margin.right]);

    // Calculate account volumes and create lanes
    const accountVolumes = new Map<string, number>();
    filteredTx.forEach(tx => {
      accountVolumes.set(tx.from, (accountVolumes.get(tx.from) || 0) + tx.amount);
      accountVolumes.set(tx.to, (accountVolumes.get(tx.to) || 0) + tx.amount);
    });
    
    // Get unique accounts and sort by volume
    const uniqueAccounts = Array.from(accountVolumes.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([accountId]) => accountId);
    
    // Create account lanes
    const laneHeight = (HEIGHT - margin.top - margin.bottom) / uniqueAccounts.length;
    const accountLanes: AccountLane[] = uniqueAccounts.map((accountId, i) => ({
      id: accountId,
      name: accounts.find(a => a.id === accountId)?.name || accountId,
      y: margin.top + i * laneHeight + laneHeight / 2,
      totalVolume: accountVolumes.get(accountId) || 0
    }));
    
    // Aggregate transactions by day and account pair
    const flowMap = new Map<string, FlowBand>();
    filteredTx.forEach(tx => {
      if (!tx.parsedDate) return;
      
      // Create daily bucket key
      const dateKey = d3.timeDay(tx.parsedDate).toISOString().split('T')[0];
      const flowKey = `${tx.from}-${tx.to}-${dateKey}`;
      
      if (!flowMap.has(flowKey)) {
        flowMap.set(flowKey, {
          id: flowKey,
          fromAccount: tx.from,
          toAccount: tx.to,
          date: d3.timeDay(tx.parsedDate),
          amount: 0,
          transactions: []
        });
      }
      
      const flow = flowMap.get(flowKey)!;
      flow.amount += tx.amount;
      flow.transactions.push(tx);
    });
    
    const flows = Array.from(flowMap.values());
    
    // Create flow width scale
    const maxFlowAmount = Math.max(...flows.map(f => f.amount));
    const flowWidthScale = d3.scaleSqrt()
      .domain([0, maxFlowAmount])
      .range([2, 40]);

    // Clear previous content
    g.selectAll("*").remove();
    
    // Draw time axis
    const xAxis = d3.axisBottom(timeScale)
      .tickFormat((d) => d3.timeFormat("%m/%d")(d as Date));
    
    g.append("g")
      .attr("class", "time-axis")
      .attr("transform", `translate(0, ${HEIGHT - margin.bottom})`)
      .call(xAxis as any);
    
    // Draw account lanes
    const lanes = g.selectAll<SVGGElement, AccountLane>(".account-lane")
      .data(accountLanes, d => d.id);
    
    const laneEnter = lanes.enter()
      .append("g")
      .attr("class", "account-lane");
    
    // Lane background
    laneEnter.append("rect")
      .attr("class", "lane-bg")
      .attr("x", margin.left)
      .attr("y", d => d.y - laneHeight / 2)
      .attr("width", WIDTH - margin.left - margin.right)
      .attr("height", laneHeight)
      .attr("fill", "#f8f9fa")
      .attr("stroke", "#e9ecef")
      .attr("stroke-width", 1);
    
    // Lane labels
    laneEnter.append("text")
      .attr("class", "lane-label")
      .attr("x", margin.left - 10)
      .attr("y", d => d.y)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .style("font-size", "12px")
      .style("font-weight", "600")
      .style("fill", "#374151")
      .text(d => d.name);
    
    // Volume labels
    laneEnter.append("text")
      .attr("class", "volume-label")
      .attr("x", margin.left - 10)
      .attr("y", d => d.y + 15)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .style("font-size", "10px")
      .style("fill", "#6b7280")
      .text(d => formatCurrencyShort(d.totalVolume));
    
    // Draw flow bands
    const flowBands = g.selectAll<SVGPathElement, FlowBand>(".flow-band")
      .data(flows, d => d.id);
    
    flowBands.enter()
      .append("path")
      .attr("class", "flow-band")
      .attr("d", d => {
        const fromLane = accountLanes.find(lane => lane.id === d.fromAccount);
        const toLane = accountLanes.find(lane => lane.id === d.toAccount);
        
        if (!fromLane || !toLane) return "";
        
        const x1 = timeScale(d.date);
        const x2 = x1 + 120; // Longer flow bands for better curves
        const y1 = fromLane.y;
        const y2 = toLane.y;
        const width = flowWidthScale(d.amount);
        
        // Create smooth continuous path with minimal deviation for easy tracing
        if (Math.abs(y1 - y2) < 5) {
          // Same or very close account lanes - straight horizontal flow
          return `M ${x1},${y1 - width/2} 
                  L ${x2},${y2 - width/2}
                  L ${x2},${y2 + width/2}
                  L ${x1},${y1 + width/2} Z`;
        } else {
          // Different lanes - gentle tapered flow that's easy to follow
          const midX = x1 + (x2 - x1) * 0.5; // Midpoint for transition
          
          // Create a gentle tapered path that maintains visual continuity
          return `M ${x1},${y1 - width/2} 
                  L ${midX},${y1 - width/2}
                  L ${x2},${y2 - width/2}
                  L ${x2},${y2 + width/2}
                  L ${midX},${y1 + width/2}
                  L ${x1},${y1 + width/2} Z`;
        }
      })
      .attr("fill", d => {
        // Color by transaction type or amount
        if (d.amount > maxFlowAmount * 0.7) return "#ef4444"; // High amounts - red
        if (d.amount > maxFlowAmount * 0.3) return "#f97316"; // Medium amounts - orange
        return "#3b82f6"; // Low amounts - blue
      })
      .attr("fill-opacity", 0.7)
      .style("cursor", "pointer")
      .on("click", function(event, d) {
        event.stopPropagation();
        
        setSelectedFlow({
          transactions: d.transactions,
          fromAccount: d.fromAccount,
          toAccount: d.toAccount,
          date: d.date,
          amount: d.amount
        });
      })
      .on("mouseover", function(event, d) {
        d3.select(this).attr("fill-opacity", 0.9);
        
        // Tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "flow-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", "1000");
        
        const fromName = accounts.find(a => a.id === d.fromAccount)?.name || d.fromAccount;
        const toName = accounts.find(a => a.id === d.toAccount)?.name || d.toAccount;
        
        tooltip.html(`
          <strong>${fromName} → ${toName}</strong><br/>
          Date: ${formatDate(d.date)}<br/>
          Amount: ${formatCurrencyShort(d.amount)}<br/>
          Transactions: ${d.transactions.length}
        `);
        
        tooltip.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("fill-opacity", 0.7);
        d3.selectAll(".flow-tooltip").remove();
      });
    
    flowBands.exit().remove();
    
  }, [transactions, minAmount, maxAmount]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div 
        ref={containerRef}
        style={{ 
          width: "100%", 
          height: "600px", 
          background: "#f9fafb", 
          borderRadius: 8, 
          border: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden"
        }}
        onClick={() => setSelectedFlow(null)} // Clear selection when clicking background
      >
        <svg ref={svgRef} style={{ cursor: "grab" }} />
      </div>
      
      {selectedFlow && (
        <div className="table-section">
          <div className="grid-container">
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "12px" 
            }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
                Flow: {accounts.find(a => a.id === selectedFlow.fromAccount)?.name || selectedFlow.fromAccount} → {accounts.find(a => a.id === selectedFlow.toAccount)?.name || selectedFlow.toAccount}
                <span style={{ fontSize: "14px", fontWeight: "normal", color: "#666", marginLeft: "8px" }}>
                  {formatDate(selectedFlow.date)} • {formatCurrencyShort(selectedFlow.amount)} • {selectedFlow.transactions.length} transactions
                </span>
              </h3>
              <button 
                onClick={() => setSelectedFlow(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  padding: "4px 8px"
                }}
              >
                ×
              </button>
            </div>
            <TransactionsTable
              transactions={selectedFlow.transactions.map(tx =>
                allTransactions.find(t => t.id === tx.id) || tx
              )}
              accounts={accounts}
              page={1}
              totalPages={1}
              onPageChange={() => {}}
              onToggleFlag={onToggleFlag}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeFlow;
