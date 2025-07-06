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
  onResetView?: () => void; // Add this prop
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
  onToggleFlag,
  onResetView
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
    (window as any).__timeflowZoom = zoom;
    (window as any).__timeflowSvg = svg;
    
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
    
    // Use single consistent colour for all accounts and flows
    const singleColour = "#4682B4"; // Steel blue
    
    // Assign same colour to all accounts
    const accountColourMap = new Map<string, string>();
    uniqueAccounts.forEach((accountId) => {
      accountColourMap.set(accountId, singleColour);
    });
    
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
    
    // Calculate running balances for each account over time
    const accountBalances = new Map<string, Array<{date: Date, balance: number, inflow: number, outflow: number}>>();
    
    // Initialize balances for all accounts
    uniqueAccounts.forEach(accountId => {
      accountBalances.set(accountId, []);
    });
    
    // Sort all flows by date to process chronologically
    const chronologicalFlows = flows.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Process each flow to update running balances
    const currentBalances = new Map<string, number>();
    uniqueAccounts.forEach(accountId => currentBalances.set(accountId, 0));
    
    chronologicalFlows.forEach(flow => {
      // Update balances
      const fromBalance = currentBalances.get(flow.fromAccount) || 0;
      const toBalance = currentBalances.get(flow.toAccount) || 0;
      
      currentBalances.set(flow.fromAccount, fromBalance - flow.amount);
      currentBalances.set(flow.toAccount, toBalance + flow.amount);
      
      // Record balance snapshots
      accountBalances.get(flow.fromAccount)?.push({
        date: flow.date,
        balance: currentBalances.get(flow.fromAccount) || 0,
        inflow: 0,
        outflow: flow.amount
      });
      
      accountBalances.get(flow.toAccount)?.push({
        date: flow.date,
        balance: currentBalances.get(flow.toAccount) || 0,
        inflow: flow.amount,
        outflow: 0
      });
    });
    
    // Clear previous content
    g.selectAll("*").remove();
    
    // Draw time axis with Australian date format
    const xAxis = d3.axisBottom(timeScale)
      .tickFormat((d) => d3.timeFormat("%d/%m")(d as Date)); // Australian DD/MM format
    
    g.append("g")
      .attr("class", "time-axis")
      .attr("transform", `translate(0, ${HEIGHT - margin.bottom})`)
      .call(xAxis as any);
    
    // Draw account lanes with balance indicators
    const lanes = g.selectAll<SVGGElement, AccountLane>(".account-lane")
      .data(accountLanes, d => d.id);
    
    const laneEnter = lanes.enter()
      .append("g")
      .attr("class", "account-lane");
    
    // Lane background - minimal/transparent
    laneEnter.append("rect")
      .attr("class", "lane-bg")
      .attr("x", margin.left)
      .attr("y", d => d.y - laneHeight / 2)
      .attr("width", WIDTH - margin.left - margin.right)
      .attr("height", laneHeight)
      .attr("fill", "none")
      .attr("stroke", "#e9ecef")
      .attr("stroke-width", 0.5)
      .attr("opacity", 0.3);
    
    // Draw balance accumulation areas for each account - now as flowing Sankey streams
    accountBalances.forEach((balanceHistory, accountId) => {
      if (balanceHistory.length === 0) return;
      
      const accountLane = accountLanes.find(lane => lane.id === accountId);
      if (!accountLane) return;
      
      // Create Sankey-style flowing band that shows balance accumulation
      // Width represents the running balance at each point in time
      const sankeyPoints: Array<{x: number, y: number, width: number}> = [];
      
      balanceHistory.forEach(point => {
        const x = timeScale(point.date);
        const balanceWidth = Math.max(2, Math.min(30, Math.abs(point.balance) / Math.max(...Array.from(accountBalances.values()).flat().map(b => Math.abs(b.balance))) * 30));
        sankeyPoints.push({
          x: x,
          y: accountLane.y,
          width: balanceWidth
        });
      });
      
      // Create smooth flowing path that varies in width based on balance
      if (sankeyPoints.length > 1) {
        let pathData = "";
        
        // Start the path
        const firstPoint = sankeyPoints[0];
        pathData += `M ${firstPoint.x},${firstPoint.y - firstPoint.width/2}`;
        
        // Create top edge
        for (let i = 1; i < sankeyPoints.length; i++) {
          const point = sankeyPoints[i];
          const prevPoint = sankeyPoints[i-1];
          const controlX = (prevPoint.x + point.x) / 2;
          
          pathData += ` Q ${controlX},${prevPoint.y - prevPoint.width/2} ${point.x},${point.y - point.width/2}`;
        }
        
        // Move to end bottom
        const lastPoint = sankeyPoints[sankeyPoints.length - 1];
        pathData += ` L ${lastPoint.x},${lastPoint.y + lastPoint.width/2}`;
        
        // Create bottom edge (reverse)
        for (let i = sankeyPoints.length - 2; i >= 0; i--) {
          const point = sankeyPoints[i];
          const nextPoint = sankeyPoints[i+1];
          const controlX = (point.x + nextPoint.x) / 2;
          
          pathData += ` Q ${controlX},${nextPoint.y + nextPoint.width/2} ${point.x},${point.y + point.width/2}`;
        }
        
        pathData += " Z";
        
        // Draw the flowing Sankey band
        g.append("path")
          .attr("class", "sankey-flow")
          .attr("d", pathData)
          .attr("fill", accountColourMap.get(accountId) || "#3b82f6")
          .attr("fill-opacity", 0.7)
          .attr("stroke", accountColourMap.get(accountId) || "#3b82f6")
          .attr("stroke-width", 1)
          .attr("stroke-opacity", 0.8);
      }
    });
    
    // Draw Sankey-style connecting flows between accounts with seamless merging
    flows.forEach(flow => {
      const fromLane = accountLanes.find(lane => lane.id === flow.fromAccount);
      const toLane = accountLanes.find(lane => lane.id === flow.toAccount);
      
      if (!fromLane || !toLane) return;
      
      const x1 = timeScale(flow.date);
      const x2 = x1 + 60; // Connection length
      const y1 = fromLane.y;
      const y2 = toLane.y;
      
      // Get the current balance width at source and destination for seamless connection
      const sourceBalance = accountBalances.get(flow.fromAccount)?.find(b => b.date.getTime() === flow.date.getTime());
      const destBalance = accountBalances.get(flow.toAccount)?.find(b => b.date.getTime() === flow.date.getTime());
      
      // Calculate actual balance widths to match the account bands exactly
      const sourceWidth = sourceBalance ? Math.max(2, Math.min(30, Math.abs(sourceBalance.balance) / Math.max(...Array.from(accountBalances.values()).flat().map(b => Math.abs(b.balance))) * 30)) : 6;
      const destWidth = destBalance ? Math.max(2, Math.min(30, Math.abs(destBalance.balance) / Math.max(...Array.from(accountBalances.values()).flat().map(b => Math.abs(b.balance))) * 30)) : 6;
      
      // Create seamless Sankey path that perfectly connects to account band edges
      // This mimics the Observable example's approach for seamless merging
      const curvature = 0.5; // Curvature factor for smooth connections
      const xi = d3.interpolateNumber(x1, x2);
      // const yi = d3.interpolateNumber(y1, y2);
      
      // Create control points for smooth cubic Bezier curves
      const cp1x = xi(curvature);
      const cp2x = xi(1 - curvature);
      
      // Build the seamless path
      const sankeyPath = `
        M ${x1},${y1 - sourceWidth/2}
        C ${cp1x},${y1 - sourceWidth/2} ${cp2x},${y2 - destWidth/2} ${x2},${y2 - destWidth/2}
        L ${x2},${y2 + destWidth/2}
        C ${cp2x},${y2 + destWidth/2} ${cp1x},${y1 + sourceWidth/2} ${x1},${y1 + sourceWidth/2}
        Z
      `;
      
      // Draw the seamless Sankey connection
      const isFlagged = flow.transactions.some(tx => tx.isFlagged);
      const sankeyConnection = g.append("path")
        .attr("class", "sankey-connection")
        .attr("d", sankeyPath)
        .attr("fill", isFlagged ? "#e11d48" : (accountColourMap.get(flow.fromAccount) || "#3b82f6"))
        .attr("fill-opacity", 0.6) // Slightly higher opacity for better visibility
        .attr("stroke", "none") // No stroke for truly seamless appearance
        .style("cursor", "pointer");
      
      // Add interactivity to Sankey connections
      sankeyConnection
        .on("click", function(event) {
          event.stopPropagation();
          setSelectedFlow({
            transactions: flow.transactions,
            fromAccount: flow.fromAccount,
            toAccount: flow.toAccount,
            date: flow.date,
            amount: flow.amount
          });
        })
        .on("mouseover", function(event) {
          d3.select(this)
            .attr("fill-opacity", 0.8)
            .attr("stroke-width", 2);
          
          // Enhanced tooltip for Sankey
          const tooltip = d3.select("body").append("div")
            .attr("class", "sankey-tooltip")
            .style("position", "absolute")
            .style("background", "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,30,30,0.9))")
            .style("color", "white")
            .style("padding", "12px")
            .style("border-radius", "8px")
            .style("font-size", "13px")
            .style("pointer-events", "none")
            .style("z-index", "1000")
            .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
            .style("border", "1px solid rgba(255,255,255,0.1)");
          
          const fromName = accounts.find(a => a.id === flow.fromAccount)?.name || flow.fromAccount;
          const toName = accounts.find(a => a.id === flow.toAccount)?.name || flow.toAccount;
          
          tooltip.html(`
            <div style="font-weight: bold; margin-bottom: 6px; color: #60a5fa;">💰 Money Flow</div>
            <div style="margin-bottom: 4px;"><strong>${fromName}</strong> → <strong>${toName}</strong></div>
            <div style="margin-bottom: 4px;">Date: ${formatDate(flow.date)}</div>
            <div style="margin-bottom: 4px;">Amount: <span style="color: #34d399; font-weight: 600;">${formatCurrencyShort(flow.amount)}</span></div>
            <div style="margin-bottom: 6px;">Transactions: ${flow.transactions.length}</div>
            <div style="font-size: 11px; opacity: 0.8; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">
              Click to view details
            </div>
          `);
          
          const rect = tooltip.node()?.getBoundingClientRect();
          const tooltipWidth = rect?.width || 250;
          
          let left = event.pageX + 15;
          let top = event.pageY - 60;
          
          if (left + tooltipWidth > window.innerWidth) {
            left = event.pageX - tooltipWidth - 15;
          }
          if (top < 0) {
            top = event.pageY + 15;
          }
          
          tooltip.style("left", left + "px").style("top", top + "px");
        })
        .on("mouseout", function() {
          d3.select(this)
            .attr("fill-opacity", 0.6)
            .attr("stroke-width", 1);
          d3.selectAll(".sankey-tooltip").remove();
        });
    });
    
    // Add account labels
    accountLanes.forEach(lane => {
      // Lane labels
      g.append("text")
        .attr("class", "lane-label")
        .attr("x", margin.left - 10)
        .attr("y", lane.y)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#374151")
        .text(lane.name);
      
      // Volume labels
      g.append("text")
        .attr("class", "volume-label")
        .attr("x", margin.left - 10)
        .attr("y", lane.y + 15)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .style("font-size", "10px")
        .style("fill", "#6b7280")
        .text(formatCurrencyShort(lane.totalVolume));
    });
    
    // Remove old continuity lines code - no longer needed
    
  }, [transactions, minAmount, maxAmount]);

  return (
    <div className="chart-page" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <div className="chart-container" style={{ position: 'relative', flex: '1 1 auto', minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative" }}>
          <div style={{ position: 'absolute', top: 8, right: 16, zIndex: 3, display: 'flex', gap: 8 }}>
            <button
              style={{
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                padding: '4px 12px',
                fontSize: 13,
                color: '#374151',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
              onClick={() => {
                if (onResetView) onResetView();
              }}
              title="Reset zoom and pan"
            >
              Reset View
            </button>
          </div>
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
              overflow: "hidden",
              position: "relative"
            }}
            onClick={() => setSelectedFlow(null)} // Clear selection when clicking background
          >
            <svg ref={svgRef} style={{ cursor: "grab" }} />
          </div>
        </div>
      </div>
      {selectedFlow && (
        <div className="table-section" style={{ flex: '0 0 auto' }}>
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
