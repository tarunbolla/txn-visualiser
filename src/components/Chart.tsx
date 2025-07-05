import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { Transaction, Account } from "../data";
import { config, formatCurrencyShort } from "../data";

export interface ChartProps {
  transactions: Transaction[];
  accounts: Account[];
  onShowTooltip: (content: React.ReactNode, x: number, y: number) => void;
  onHideTooltip: () => void;
}

const Chart: React.FC<ChartProps> = ({ 
  transactions, 
  accounts, 
  onShowTooltip,
  onHideTooltip,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    // Get container dimensions for responsive sizing
    const containerRect = containerRef.current.getBoundingClientRect();
    // Use fixed height for better scrollable layout, increased to accommodate legend
    const width = Math.max(600, containerRect.width - 48); // Account for padding
    const height = 580; // Increased height to accommodate legend below x-axis
    const margin = { top: 30, right: 30, bottom: 55, left: 150 };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const svgRect = svgRef.current.getBoundingClientRect();

    // Helper function to get label background color based on amount
    const getLabelColor = (amount: number) => {
      const minAmount = Math.min(...transactions.map(t => t.amount));
      const maxAmount = Math.max(...transactions.map(t => t.amount));
      const normalizedAmount = (amount - minAmount) / (maxAmount - minAmount);
      // Interpolate between pastel orange and red
      const red = Math.round(255 - (normalizedAmount * 40)); // 255 to 215
      const green = Math.round(165 - (normalizedAmount * 65)); // 165 to 100
      const blue = Math.round(79 - (normalizedAmount * 39)); // 79 to 40
      return `rgb(${red}, ${green}, ${blue})`;
    };

    // X: time scale
    const dates = transactions.map((d) => d.parsedDate!);
    const minDate = d3.min(dates)!;
    const maxDate = d3.max(dates)!;
    const xScale = d3
      .scaleTime()
      .domain([minDate, maxDate])
      .range([margin.left, width - margin.right]);

    // Y: accounts as bands
    const yScale = d3
      .scaleBand<string>()
      .domain(accounts.map((a) => a.id))
      .range([margin.top, height - margin.bottom])
      .paddingInner(0.2)
      .paddingOuter(0.2);

    // Clipping path to keep arrows within chart area
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", "chart-area")
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom);

    // Create arrowhead markers
    const defs = svg.select("defs");
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 9)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,0 L10,5 L0,10 z")
      .attr("fill", "#374151");
    Object.entries(config.transactionTypeColors).forEach(([type, color]) => {
      defs
        .append("marker")
        .attr("id", `arrowhead-${type}`)
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 9)
        .attr("refY", 5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,0 L10,5 L0,10 z")
        .attr("fill", color);
    });

    // Draw grid lines first (background)
    const gridGroup = svg.append("g").attr("class", "grid-background");
    
    // Draw horizontal grid lines
    gridGroup
      .append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-(width - margin.left - margin.right))
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 1)
      .attr("opacity", 0.3);

    // Draw vertical grid lines
    gridGroup
      .append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(6)
          .tickSize(-(height - margin.top - margin.bottom))
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 1)
      .attr("opacity", 0.3);

    // Draw y-axis (accounts)
    svg
      .append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(
        d3
          .axisLeft(yScale)
          .tickFormat((id) => accounts.find((a) => a.id === id)?.name || id)
      )
      .selectAll("text")
      .attr("font-size", 14)
      .attr("fill", "#374151");

    // Draw x-axis (dates) at the very bottom
    svg
      .append("g")
      .attr("class", "x-axis")
      .attr(
        "transform",
        `translate(0,${height - margin.bottom + 25})` // Move x-axis to bottom, visible
      )
      .call(
        d3.axisBottom(xScale)
          .ticks(6)
          .tickFormat((domainValue, _i) => {
            if (domainValue instanceof Date) {
              return d3.timeFormat("%b %Y")(domainValue);
            }
            return String(domainValue);
          })
      )
      .selectAll("text")
      .attr("font-size", 12)
      .attr("fill", "#374151");

    // For spacing: group txns by date only to prevent overlap
    const txByDate = d3.rollups(
      transactions,
      (v) => v,
      (d) => d.date
    );
    // Helper: get offset for each txn in its date group
    const txOffsetMap = new Map<string, number>();
    txByDate.forEach((dateGroup) => {
      const txnsOnDate = dateGroup[1];
      txnsOnDate.forEach((txn, i) => {
        txOffsetMap.set(txn.id, i);
      });
    });
    const arrowSpacing = 15; // px between arrows on same date (increased for better separation)

    // Draw arrows for transactions
    const arrowsGroup = svg
      .append("g")
      .attr("class", "arrows")
      .attr("clip-path", "url(#chart-area)");
      
    const arrowElements = arrowsGroup
      .selectAll("g.tx-arrow-group")
      .data(transactions)
      .enter()
      .append("g")
      .attr("class", "tx-arrow-group");

    // Draw arrow lines first
    arrowElements.each(function (d) {
        const fromY = yScale(d.from)! + yScale.bandwidth() / 2;
        const toY = yScale(d.to)! + yScale.bandwidth() / 2;
        const baseX = xScale(d.parsedDate!);
        // Get the number of transactions on the same date
        const txnsOnSameDate = transactions.filter(tx => tx.date === d.date);
        const groupSize = txnsOnSameDate.length;
        const myIndex = txOffsetMap.get(d.id) || 0;
        // Center the group and space them evenly
        const offset = (myIndex - (groupSize - 1) / 2) * arrowSpacing;
        // Add more space from y-axis borders
        const x = Math.max(margin.left + 25, Math.min(width - margin.right - 25, baseX + offset));
        const arrowColor = config.transactionTypeColors[d.type as keyof typeof config.transactionTypeColors] || config.defaultArrowColor;
        const arrowMarkerId = config.transactionTypeColors[d.type as keyof typeof config.transactionTypeColors] ? `arrowhead-${d.type}` : 'arrowhead';

        const fromAccount = accounts.find(a => a.id === d.from)?.name || d.from;
        const toAccount = accounts.find(a => a.id === d.to)?.name || d.to;

        const tooltipContent = (
          <div 
            style={{ 
              fontSize: '12px', 
              lineHeight: '1.4',
              userSelect: 'text',
              cursor: 'text',
              whiteSpace: 'nowrap'
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#fff' }}>
              {d.description || "Transaction"}
            </div>
            <div style={{ marginBottom: '3px' }}>
              <strong>Amount:</strong> {formatCurrencyShort(d.amount)}
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>From:</strong> {fromAccount}
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>To:</strong> {toAccount}
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>Type:</strong> {d.type}
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>Date:</strong> {d.date}
            </div>
          </div>
        );

        // Draw straight line (arrow)
        d3.select(this)
          .append("line")
          .attr("x1", x)
          .attr("y1", fromY)
          .attr("x2", x)
          .attr("y2", toY)
          .attr("stroke", arrowColor)
          .attr("stroke-width", 2)
          .attr("fill", "none")
          .attr("marker-end", `url(#${arrowMarkerId})`)
          .attr("opacity", 0.85)
          .style("cursor", "pointer")
          .on("mouseenter", function () {
            d3.select(this as SVGLineElement).attr("opacity", 1);
            // Position tooltip just above the top of the arrow, centered horizontally
            const tooltipX = svgRect.left + x;
            const tooltipY = svgRect.top + Math.min(fromY, toY);
            onShowTooltip(tooltipContent, tooltipX, tooltipY);
          })
          .on("mouseleave", function () {
            d3.select(this as SVGLineElement).attr("opacity", 0.85);
            onHideTooltip();
          });
      });

    // Draw labels on top (separate pass to ensure they're above arrows)
    arrowElements.each(function (d) {
        const fromY = yScale(d.from)! + yScale.bandwidth() / 2;
        const toY = yScale(d.to)! + yScale.bandwidth() / 2;
        const baseX = xScale(d.parsedDate!);
        const txnsOnSameDate = transactions.filter(tx => tx.date === d.date);
        const groupSize = txnsOnSameDate.length;
        const myIndex = txOffsetMap.get(d.id) || 0;
        const offset = (myIndex - (groupSize - 1) / 2) * arrowSpacing;
        const x = Math.max(margin.left + 25, Math.min(width - margin.right - 25, baseX + offset));

        const fromAccount = accounts.find(a => a.id === d.from)?.name || d.from;
        const toAccount = accounts.find(a => a.id === d.to)?.name || d.to;

        const tooltipContent = (
          <div 
            style={{ 
              fontSize: '12px', 
              lineHeight: '1.4',
              userSelect: 'text',
              cursor: 'text',
              whiteSpace: 'nowrap'
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#fff' }}>
              {d.description || "Transaction"}
            </div>
            <div style={{ marginBottom: '3px' }}>
              <strong>Amount:</strong> {formatCurrencyShort(d.amount)}
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>From:</strong> {fromAccount}
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>To:</strong> {toAccount}
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>Type:</strong> {d.type}
            </div>
            <div style={{ marginBottom: '2px' }}>
              <strong>Date:</strong> {d.date}
            </div>
          </div>
        );

        // Add amount label with colored background at center of the arrow
        const midY = (fromY + toY) / 2;
        const labelGroup = d3.select(this).append("g").attr("class", "amount-label");
        const labelText = formatCurrencyShort(d.amount);
        const textWidth = labelText.length * 6; // Approximate text width
        const textHeight = 14;
        
        labelGroup
          .append("rect")
          .attr("x", x - textWidth / 2 - 2)
          .attr("y", midY - textHeight / 2)
          .attr("width", textWidth + 4)
          .attr("height", textHeight)
          .attr("fill", getLabelColor(d.amount))
          .attr("fill-opacity", 0.9)
          .attr("rx", 2)
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.5)
          .style("cursor", "pointer")
          .on("mouseenter", function () {
            // Position tooltip just above the arrow, centered horizontally
            const tooltipX = svgRect.left + x;
            const tooltipY = svgRect.top + Math.min(fromY, toY); // Use arrow's top for Y
            onShowTooltip(tooltipContent, tooltipX, tooltipY);
          })
          .on("mouseleave", function () {
            onHideTooltip();
          });
        labelGroup
          .append("text")
          .attr("x", x)
          .attr("y", midY)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("font-size", 10)
          .attr("font-weight", "bold")
          .attr("fill", "#fff")
          .attr("font-family", "'Segoe UI', Arial, sans-serif")
          .style("cursor", "pointer")
          .style("pointer-events", "none") // Let the rect handle the events
          .text(labelText);
      });

    // Add legend at bottom (positioned to avoid x-axis overlap)
    const legendY = height - margin.bottom + 45; // Position legend below x-axis with spacing
    const legendItems = Object.entries(config.transactionTypeColors);
    const legendSpacing = Math.min(150, (width - margin.left - margin.right) / legendItems.length);
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${margin.left},${legendY})`);
    legendItems.forEach(([type, color], i) => {
      const legendGroup = legend
        .append("g")
        .attr("transform", `translate(${i * legendSpacing + 10},0)`);
      legendGroup
        .append("rect")
        .attr("width", 12)
        .attr("height", 3)
        .attr("fill", color)
        .attr("rx", 1); // Slightly rounded corners
      legendGroup
        .append("text")
        .attr("x", 18)
        .attr("y", 2)
        .attr("dy", "0.35em")
        .attr("font-size", 11)
        .attr("fill", "#374151")
        .attr("font-family", "'Segoe UI', Arial, sans-serif")
        .text(type);
    });

    // Add resize observer for responsive behavior
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize to avoid too many re-renders
      const timeoutId = setTimeout(() => {
        // Force re-render by updating a dummy state
        const event = new CustomEvent('chartResize');
        containerRef.current?.dispatchEvent(event);
      }, 150);
      return () => clearTimeout(timeoutId);
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => {
      resizeObserver.disconnect();
    };
  }, [transactions, accounts, onShowTooltip, onHideTooltip]);

  return (
    <div className="chart-container" ref={containerRef}>
      <svg ref={svgRef} />
    </div>
  );
};

export default Chart;
