import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { Transaction, Account } from "../data";
import { config, formatCurrencyShort } from "../data";

export interface ChartProps {
  transactions: Transaction[];
  accounts: Account[];
  onShowTooltip: (content: React.ReactNode, x: number, y: number) => void;
  onHideTooltip: () => void;
  onToggleFlag: (id: string) => void;
}

const Chart: React.FC<ChartProps> = ({ 
  transactions, 
  accounts, 
  onShowTooltip,
  onHideTooltip,
  onToggleFlag,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Store the current x domain for zooming
  const [xDomain, setXDomain] = useState<[Date, Date] | null>(null);

  // Store the initial x domain for reset
  const initialXDomain = React.useMemo(() => {
    // No date filter needed, just use all transactions
    if (!transactions.length) return [new Date(), new Date()] as [Date, Date];
    const minDate = d3.min(transactions, d => d.parsedDate!)!;
    const maxDate = d3.max(transactions, d => d.parsedDate!)!;
    // Add buffer space of 2 days on each side
    const bufferedMin = d3.timeDay.offset(minDate, -2);
    const bufferedMax = d3.timeDay.offset(maxDate, 2);
    return [bufferedMin, bufferedMax] as [Date, Date];
  }, [transactions]);

  // Use a ref to hold the latest callbacks, avoiding stale closures in D3
  const callbacks = useRef({ onShowTooltip, onHideTooltip, onToggleFlag });
  useEffect(() => {
    callbacks.current = { onShowTooltip, onHideTooltip, onToggleFlag };
  }, [onShowTooltip, onHideTooltip, onToggleFlag]);

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
    const minAmount = d3.min(transactions, t => t.amount);
    const maxAmount = d3.max(transactions, t => t.amount);
    const labelColorDomain = (minAmount === undefined || maxAmount === undefined || minAmount === maxAmount) ?
                             [0, Math.max(1, maxAmount || 1)] : [minAmount, maxAmount];
    const labelAmountColorScale = d3.scaleQuantize<string>()
        .domain(labelColorDomain)
        .range(config.labelAmountBracketColors);

    // X: time scale
    const dates = transactions.map((d) => d.parsedDate!);
    // Use padded domain for default view
    const [paddedMin, paddedMax] = initialXDomain;
    const minDate = paddedMin;
    const maxDate = paddedMax;
    // Use zoomed domain if present
    const xScale = d3
      .scaleTime()
      .domain(xDomain || [minDate, maxDate])
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
    Object.entries(config.transactionTypeColors).forEach(([type, color]) => {
      defs
        .append("marker")
        .attr("id", `arrowhead-${type.replace(/\s+/g, '-')}`)
        .attr("viewBox", "-0 -5 10 10")
        .attr("refX", 8)
        .attr("refY", 0)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M 0,-5 L 10 ,0 L 0,5")
        .attr("fill", color);
    });
    defs
      .append("marker")
      .attr("id", "arrowhead-default")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", config.defaultArrowColor);

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

    // Draw x-axis (dates) at the bottom of the chart area
    // Dynamically choose tick interval based on zoom level
    const xDomainArr = xScale.domain();
    const xStart = xDomainArr[0];
    const xEnd = xDomainArr[1];
    const daysSpan = (xEnd.getTime() - xStart.getTime()) / (1000 * 60 * 60 * 24);
    let xTickInterval;
    let xTickFormat;
    if (daysSpan > 60) {
      xTickInterval = d3.timeMonth.every(1);
      xTickFormat = d3.timeFormat("%b %Y");
    } else if (daysSpan > 20) {
      xTickInterval = d3.timeDay.every(10);
      xTickFormat = d3.timeFormat("%d %b");
    } else {
      xTickInterval = d3.timeDay.every(1);
      xTickFormat = d3.timeFormat("%d %b");
    }
    svg
      .append("g")
      .attr("class", "x-axis")
      .attr(
        "transform",
        `translate(0,${height - margin.bottom})` // Move x-axis to bottom of chart area
      )
      .call(
        d3.axisBottom(xScale)
          .ticks(xTickInterval)
          .tickFormat((domainValue) => {
            if (domainValue instanceof Date) {
              return xTickFormat(domainValue);
            }
            return String(domainValue);
          })
      )
      .selectAll("text")
      .attr("font-size", 12)
      .attr("fill", "#374151");

    // Only render transactions within the current xScale domain
    const visibleTransactions: Transaction[] = transactions.filter((t: Transaction) => {
      const d = t.parsedDate!;
      return d >= xStart && d <= xEnd;
    });

    // For horizontal spacing: group txns by date only
    const txByDate = d3.rollups(
      visibleTransactions,
      (v) => v,
      (d) => d.date
    );
    // Map: txn id -> index in its date group
    const txOffsetMap = new Map<string, number>();
    txByDate.forEach(([_, txns]) => {
      txns.forEach((txn, i) => {
        txOffsetMap.set(txn.id, i);
      });
    });
    const arrowSpacing = 15; // px between arrows on same date

    // For label overlap: group txns by date, from, to
    const txByDateFromTo = d3.rollups(
      visibleTransactions,
      (v) => v,
      (d) => `${d.date}|${d.from}|${d.to}`
    );
    // Map: txn id -> index in its group
    const txLabelIndexMap = new Map<string, number>();
    txByDateFromTo.forEach(([_, txns]) => {
      txns.forEach((txn, i) => {
        txLabelIndexMap.set(txn.id, i);
      });
    });
    const labelPositions = [0.2, 0.4, 0.6, 0.8]; // 20%, 40%, 60%, 80%

    // Draw arrows for transactions
    const arrowsGroup = svg
      .append("g")
      .attr("class", "arrows")
      .attr("clip-path", "url(#chart-area)");
      
    const arrowElements = arrowsGroup
      .selectAll<SVGGElement, Transaction>("g.tx-arrow-group")
      .data(visibleTransactions)
      .enter()
      .append("g")
      .attr("class", "tx-arrow-group");

    // Draw all elements for each transaction and add handlers to the group
    arrowElements.each(function (_, i, nodes) {
        const group = d3.select(this);
        const d = d3.select(nodes[i]).datum() as Transaction;

        const fromY = yScale(d.from)! + yScale.bandwidth() / 2;
        const toY = yScale(d.to)! + yScale.bandwidth() / 2;
        // Restore X offset for same-date transactions
        const baseX = xScale(d.parsedDate!);
        const txnsOnSameDate = txByDate.find(([date]) => date === d.date)?.[1] || [];
        const groupSize = txnsOnSameDate.length;
        const myIndex = txOffsetMap.get(d.id) || 0;
        const offset = (myIndex - (groupSize - 1) / 2) * arrowSpacing;
        const x = baseX + offset;
        // Use randomized label position along the arrow
        const labelIndex = txLabelIndexMap.get(d.id) || 0;
        const labelPct = labelPositions[labelIndex % labelPositions.length];
        const labelY = fromY + (toY - fromY) * labelPct;
        const arrowColor = config.transactionTypeColors[d.type as keyof typeof config.transactionTypeColors] || config.defaultArrowColor;
        const markerType = d.type || "Other";
        const arrowMarkerId = config.transactionTypeColors[markerType as keyof typeof config.transactionTypeColors] 
            ? `arrowhead-${markerType.replace(/\s+/g, '-')}` 
            : 'arrowhead-default';

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
        group
          .append("line")
          .attr("x1", x)
          .attr("y1", fromY)
          .attr("x2", x)
          .attr("y2", toY)
          .attr("stroke", arrowColor)
          .attr("stroke-width", config.normalArrowThickness)
          .attr("fill", "none")
          .attr("marker-end", `url(#${arrowMarkerId})`)
          .attr("opacity", 0.85);

        // Add amount label with colored background at randomized position along the arrow
        const labelGroup = group.append("g").attr("class", "amount-label");

        const labelText = formatCurrencyShort(d.amount);
        const amountTextElement = labelGroup
          .append("text")
          .attr("x", x)
          .attr("y", labelY)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("font-size", 10)
          .attr("fill", "#000")
          .attr("font-family", "'Segoe UI', Arial, sans-serif")
          .text(labelText);

        const amountBBox = (amountTextElement.node() as SVGTextElement).getBBox();

        labelGroup
          .insert("rect", "text")
          .attr("x", amountBBox.x - 4)
          .attr("y", amountBBox.y - 2)
          .attr("width", amountBBox.width + 8)
          .attr("height", amountBBox.height + 4)
          .attr("fill", labelAmountColorScale(d.amount))
          .attr("fill-opacity", 0.9)
          .attr("rx", 4)
          .attr("stroke", d.isFlagged ? "#e11d48" : "#fff") // Red stroke if flagged
          .attr("stroke-width", d.isFlagged ? 1.5 : 0.5); // Thicker if flagged

        if (d.isFlagged) {
          labelGroup
            .append("text")
            .attr("x", amountBBox.x + amountBBox.width + 2)
            .attr("y", labelY)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "middle")
            .attr("font-size", 14)
            .text("🚩");
        }

        // Add handlers to the parent group for reliable interaction
        group
          .style("cursor", "pointer")
          .on("click", (event) => {
            event.stopPropagation();
            callbacks.current.onToggleFlag(d.id);
          })
          .on("mouseenter", function () {
            group.select("line").attr("opacity", 1);
            const tooltipX = svgRect.left + baseX;
            const tooltipY = svgRect.top + Math.min(fromY, toY);
            callbacks.current.onShowTooltip(tooltipContent, tooltipX, tooltipY);
          })
          .on("mouseleave", function () {
            group.select("line").attr("opacity", 0.85);
            callbacks.current.onHideTooltip();
          });
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
  }, [transactions, accounts, xDomain, initialXDomain]); // Added initialXDomain to dependencies

  // D3 zoom for X axis only
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    // Remove any previous zoom listeners
    svg.on("wheel.zoom", null).on("mousedown.zoom", null).on("touchstart.zoom", null);
    // Use buffered domain for zoom
    const [minDate, maxDate] = initialXDomain;
    const x = d3.scaleTime().domain([minDate, maxDate]).range([150, Math.max(600, svgRef.current.getBoundingClientRect().width - 48) - 30]);
    // Set up zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on("zoom", (event) => {
        // Only X axis
        const t = event.transform;
        const zx = t.rescaleX(x);
        setXDomain(zx.domain() as [Date, Date]);
      });
    svg.call(zoom as d3.ZoomBehavior<SVGSVGElement, unknown>);
    // Expose zoom and svg for reset
    (window as unknown as { __chartZoom?: d3.ZoomBehavior<SVGSVGElement, unknown>; __chartSvg?: d3.Selection<SVGSVGElement, unknown, null, undefined>; }).__chartZoom = zoom;
    (window as unknown as { __chartZoom?: d3.ZoomBehavior<SVGSVGElement, unknown>; __chartSvg?: d3.Selection<SVGSVGElement, unknown, null, undefined>; }).__chartSvg = svg;
    // Clean up
    return () => {
      svg.on("wheel.zoom", null).on("mousedown.zoom", null).on("touchstart.zoom", null);
    };
  }, [transactions, initialXDomain]);

  return (
    <div className="chart-container" ref={containerRef} style={{ position: 'relative' }}>
      {/* Chart controls top right */}
      <div style={{ position: 'absolute', top: 8, right: 16, zIndex: 2 }}>
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
            setXDomain(null);
            // Also reset D3 zoom transform
            if ((window as any).__chartZoom && (window as any).__chartSvg) {
              (window as any).__chartSvg.call((window as any).__chartZoom.transform, d3.zoomIdentity);
            }
          }}
          title="Reset zoom and pan"
        >
          Reset View
        </button>
      </div>
      <svg ref={svgRef} />
    </div>
  );
};

export default Chart;
