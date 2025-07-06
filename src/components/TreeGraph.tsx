import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { accounts, formatCurrencyShort, config } from "../data";
import type { Transaction } from "../data";
import TransactionsTable from "./TransactionsTable";

interface TreeGraphProps {
  transactions: Transaction[];
  activeAccount: string;
  minAmount: number;
  maxAmount: number;
  onActiveAccountChange?: (accountId: string) => void;
  onResetView?: () => void; // Add this prop
}

interface TreeNode {
  id: string;
  name: string;
  direction: "root" | "in" | "out";
  value: number;
  children: TreeNode[];
  parentId?: string; // Track the parent node ID for specific path context
  transactions: Transaction[]; // Store relevant transaction objects for this node
}

function aggregateEdges(transactions: Transaction[], direction: "in" | "out", accountId: string) {
  // Aggregate by counterparty, only considering transactions in the specified direction
  const map = new Map<string, { value: number; txCount: number }>();
  transactions.forEach((tx) => {
    let counterparty = null;
    if (direction === "out" && tx.from === accountId) {
      counterparty = tx.to;
    } else if (direction === "in" && tx.to === accountId) {
      counterparty = tx.from;
    }
    
    if (counterparty) {
      if (!map.has(counterparty)) map.set(counterparty, { value: 0, txCount: 0 });
      map.get(counterparty)!.value += tx.amount;
      map.get(counterparty)!.txCount += 1;
    }
  });
  return Array.from(map.entries()).map(([id, { value, txCount }]) => ({ id, value, txCount }));
}

// Recursively build outgoing or incoming tree
function buildDirectionalTree(
  transactions: Transaction[],
  accountId: string,
  direction: "in" | "out",
  visited = new Set<string>(),
  depth = 0,
  parentId?: string
): TreeNode | null {
  if (visited.has(accountId) || depth > config.treeGraph.maxDepth) return null; // Prevent cycles and limit depth
  visited.add(accountId);

  let nodeValue = 0;
  let nodeTxs: Transaction[] = [];
  if (parentId) {
    if (direction === "out") {
      // Outgoing tree: value is sum of transactions FROM parent TO this node
      const txs = transactions.filter(tx => tx.from === parentId && tx.to === accountId);
      nodeValue = txs.reduce((sum, tx) => sum + tx.amount, 0);
      nodeTxs = txs;
    } else {
      // Incoming tree: value is sum of transactions FROM this node TO parent
      const txs = transactions.filter(tx => tx.from === accountId && tx.to === parentId);
      nodeValue = txs.reduce((sum, tx) => sum + tx.amount, 0);
      nodeTxs = txs;
    }
  } else if (depth === 0) {
    // This is the root of the subtree (direct child of main root)
    if (direction === "out") {
      // Total debits (outgoing) from this account
      const txs = transactions.filter(tx => tx.from === accountId);
      nodeValue = txs.reduce((sum, tx) => sum + tx.amount, 0);
      nodeTxs = txs;
    } else {
      // Total credits (incoming) to this account
      const txs = transactions.filter(tx => tx.to === accountId);
      nodeValue = txs.reduce((sum, tx) => sum + tx.amount, 0);
      nodeTxs = txs;
    }
  }

  // Find children - accounts this node connects to in the tree direction
  const agg = aggregateEdges(transactions, direction, accountId);
  if (agg.length === 0 && !parentId) return null; // No connections for root level

  const newVisited = new Set(visited);
  return {
    id: accountId,
    name: accounts.find((a) => a.id === accountId)?.name || accountId,
    direction,
    value: nodeValue,
    parentId,
    transactions: nodeTxs,
    children: agg
      .slice(0, config.treeGraph.maxChildrenPerNode) // Limit children per node
      .map((a) => buildDirectionalTree(transactions, a.id, direction, newVisited, depth + 1, accountId))
      .filter((child): child is TreeNode => child !== null),
  };
}

function buildFullTree(transactions: Transaction[], accountId: string): TreeNode {
  // Build outgoing tree (right side): accounts that receive money FROM the active account
  const outTree = buildDirectionalTree(transactions, accountId, "out");
  // Build incoming tree (left side): accounts that send money TO the active account  
  const inTree = buildDirectionalTree(transactions, accountId, "in");
  
  // For the root node, collect all transactions involving the account
  const allTxs = transactions.filter(tx => tx.from === accountId || tx.to === accountId);

  return {
    id: accountId,
    name: accounts.find((a) => a.id === accountId)?.name || accountId,
    direction: "root",
    value: 0,
    parentId: undefined,
    transactions: allTxs,
    children: [outTree, inTree].filter((child): child is TreeNode => child !== null),
  };
}

const TreeGraph: React.FC<TreeGraphProps> = ({ 
  transactions, 
  activeAccount, 
  minAmount, 
  maxAmount, 
  onActiveAccountChange,
  onResetView
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const dimensionsRef = useRef<{ width: number; height: number } | null>(null);
  
  // State for selected node and its transactions
  const [selectedNode, setSelectedNode] = useState<{
    accountId: string;
    direction: "in" | "out" | "root";
    parentId?: string;
    transactions: Transaction[];
  } | null>(null);

  // State for context menu
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    accountId: string;
    accountName: string;
  } | null>(null);

  // Update node click handler to use transactionIds
  const handleNodeClick = (
    accountId: string,
    direction: "in" | "out" | "root",
    parentId: string | undefined,
    filteredTx: Transaction[],
    nodeTransactions?: Transaction[]
  ) => {
    let txs: Transaction[] = [];
    if (nodeTransactions) {
      txs = nodeTransactions;
    } else if (direction === "root") {
      txs = filteredTx.filter(tx => tx.from === activeAccount || tx.to === activeAccount);
    } else {
      txs = [];
    }
    setSelectedNode({ accountId, direction, parentId, transactions: txs });
  };

  // Initialize zoom behavior once
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Calculate and store fixed dimensions (container width - 10%)
    const containerRect = containerRef.current.getBoundingClientRect();
    const WIDTH = Math.floor(containerRect.width * 0.9);
    const HEIGHT = 500;
    
    // Store dimensions for consistent use
    dimensionsRef.current = { width: WIDTH, height: HEIGHT };
    
    const svg = d3.select(svgRef.current);
    svg.attr("width", WIDTH).attr("height", HEIGHT);
    
    // Create main group for zoom/pan
    const g = svg.append("g");
    gRef.current = g;

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom as any);
    (window as any).__treeZoom = zoom;
    (window as any).__treeSvg = svg;
    
    // Cleanup function
    return () => {
      svg.selectAll("*").remove();
      zoomRef.current = null;
      gRef.current = null;
      dimensionsRef.current = null;
    };
  }, []);

  // Reset zoom when active account changes
  useEffect(() => {
    if (zoomRef.current && svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(750).call(
        zoomRef.current.transform,
        d3.zoomIdentity
      );
    }
  }, [activeAccount]);

  // Handle clicks outside to close context menu
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };

    if (contextMenu?.visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu?.visible]);

  // Update content when filters change
  useEffect(() => {
    if (!activeAccount || !containerRef.current || !gRef.current || !dimensionsRef.current) return;
    
    // Use the stored fixed dimensions
    const { width: WIDTH, height: HEIGHT } = dimensionsRef.current;

    const g = gRef.current;
    
    const filteredTx = transactions.filter(
      (tx) => tx.amount >= minAmount && tx.amount <= maxAmount
    );
    const treeData = buildFullTree(filteredTx, activeAccount);

    // Collect all nodes and links data with stable IDs and parent information
    const allNodes: Array<{
      id: string, 
      x: number, 
      y: number, 
      r: number, 
      fill: string, 
      stroke: string, 
      strokeWidth: number,
      accountId: string,
      parentId?: string,
      direction: "in" | "out" | "root",
      transactions: Transaction[]
    }> = [];
    const allLinks: Array<{id: string, d: string}> = [];
    const allTexts: Array<{id: string, x: number, y: number, text: string, anchor: string, fontSize: string, fill: string, fontWeight?: string, flagged?: boolean}> = [];

    // Outgoing (right) subtree - shows where money flows TO from the active account
    if (treeData.children[0]) {
      const outRoot = d3.hierarchy(treeData.children[0]);
      const dx = 40;
      const dy = 150;
      const outTree = d3.tree<TreeNode>().nodeSize([dx, dy]);
      outTree(outRoot);
      
      // Adjust positions for right side
      outRoot.descendants().forEach((d) => {
        d.y = (WIDTH / 2) + d.y! + 30;
        d.x = (HEIGHT / 2) + d.x!;
      });
      
      // Collect links
      outRoot.links().forEach((link, i) => {
        allLinks.push({
          id: `out-link-${link.source.data.id}-${link.target.data.id}-${i}`,
          d: d3.linkHorizontal<any, any>()({
            source: [link.source.y!, link.source.x!],
            target: [link.target.y!, link.target.x!],
          }) as string
        });
      });
      
      // Collect nodes and texts
      // Compute min/max value for scaling
      const nodeValues = outRoot.descendants().map(d => d.data.value);
      const minNodeValue = Math.min(...nodeValues, 0);
      const maxNodeValue = Math.max(...nodeValues, 1);
      const scaleRadius = d3.scaleSqrt()
        .domain([minNodeValue, maxNodeValue])
        .range([4, 16]);
      outRoot.descendants().forEach((d, i) => {
        allNodes.push({
          id: `out-${d.data.id}`,
          x: d.y!,
          y: d.x!,
          r: scaleRadius(d.data.value),
          fill: "#fff",
          stroke: "#555",
          strokeWidth: 1.5,
          accountId: d.data.id,
          parentId: d.data.parentId,
          direction: "out",
          transactions: d.data.transactions // <-- attach transactionIds
        });
        
        allTexts.push({
          id: `out-name-${d.data.id}-${i}`,
          x: d.y! + 8,
          y: d.x!,
          text: d.data.name,
          anchor: "start",
          fontSize: "10px",
          fill: "#333"
        });
        
        allTexts.push({
          id: `out-value-${d.data.id}-${i}`,
          x: d.y! + 8,
          y: d.x! + 12,
          text: `${formatCurrencyShort(d.data.value)} (${d.data.transactions.length})`,
          anchor: "start",
          fontSize: "9px",
          fill: "#666",
          flagged: d.data.transactions.some(tx => tx.isFlagged) // <-- add flagged property
        });
      });
    }
    
    // Incoming (left) subtree - shows where money flows FROM to the active account
    if (treeData.children[1]) {
      const inRoot = d3.hierarchy(treeData.children[1]);
      const dx = 40;
      const dy = 150;
      const inTree = d3.tree<TreeNode>().nodeSize([dx, dy]);
      inTree(inRoot);
      
      // Adjust positions for left side (mirror)
      inRoot.descendants().forEach((d) => {
        d.y = (WIDTH / 2) - d.y! - 30;
        d.x = (HEIGHT / 2) + d.x!;
      });
      
      // Collect links
      inRoot.links().forEach((link, i) => {
        allLinks.push({
          id: `in-link-${link.source.data.id}-${link.target.data.id}-${i}`,
          d: d3.linkHorizontal<any, any>()({
            source: [link.source.y!, link.source.x!],
            target: [link.target.y!, link.target.x!],
          }) as string
        });
      });
      
      // Collect nodes and texts
      // Compute min/max value for scaling
      const inNodeValues = inRoot.descendants().map(d => d.data.value);
      const minInNodeValue = Math.min(...inNodeValues, 0);
      const maxInNodeValue = Math.max(...inNodeValues, 1);
      const inScaleRadius = d3.scaleSqrt()
        .domain([minInNodeValue, maxInNodeValue])
        .range([4, 16]);
      inRoot.descendants().forEach((d, i) => {
        allNodes.push({
          id: `in-${d.data.id}`,
          x: d.y!,
          y: d.x!,
          r: inScaleRadius(d.data.value),
          fill: "#fff",
          stroke: "#555",
          strokeWidth: 1.5,
          accountId: d.data.id,
          parentId: d.data.parentId,
          direction: "in",
          transactions: d.data.transactions // <-- attach transactionIds
        });
        
        allTexts.push({
          id: `in-name-${d.data.id}-${i}`,
          x: d.y! - 8,
          y: d.x!,
          text: d.data.name,
          anchor: "end",
          fontSize: "10px",
          fill: "#333"
        });
        
        allTexts.push({
          id: `in-value-${d.data.id}-${i}`,
          x: d.y! - 8,
          y: d.x! + 12,
          text: `${formatCurrencyShort(d.data.value)} (${d.data.transactions.length})`,
          anchor: "end",
          fontSize: "9px",
          fill: "#666",
          flagged: d.data.transactions.some(tx => tx.isFlagged) // <-- add flagged property
        });
      });
    }
    
    // Add root node
    allNodes.push({
      id: `root-${activeAccount}`,
      x: WIDTH / 2,
      y: HEIGHT / 2,
      r: 6,
      fill: "#fff",
      stroke: "#000",
      strokeWidth: 2,
      accountId: activeAccount,
      direction: "root",
      transactions: treeData.transactions // <-- attach transactionIds
    });
    
    allTexts.push({
      id: `root-text-${activeAccount}`,
      x: WIDTH / 2,
      y: HEIGHT / 2 - 12,
      text: treeData.name,
      anchor: "middle",
      fontSize: "12px",
      fill: "#000",
      fontWeight: "bold",
      flagged: treeData.transactions.some(tx => tx.isFlagged)
    });

    // Use D3 data joins for smooth updates with stable IDs
    const links = g.selectAll<SVGPathElement, {id: string, d: string}>(".tree-link")
      .data(allLinks, d => d.id);
    
    links.enter()
      .append("path")
      .attr("class", "tree-link")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .merge(links)
      .attr("d", d => d.d);
    
    links.exit().remove();

    const nodes = g.selectAll<SVGCircleElement, typeof allNodes[0]>(".tree-node")
      .data(allNodes, d => d.id);
    
    const nodeEnter = nodes.enter()
      .append("circle")
      .attr("class", "tree-node")
      .style("cursor", "pointer");
    
    nodeEnter.merge(nodes)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.r)
      .attr("fill", d => {
        // Highlight selected node with more precise matching including parent context
        if (selectedNode) {
          const isSelected = 
            d.accountId === selectedNode.accountId && 
            d.direction === selectedNode.direction &&
            d.parentId === selectedNode.parentId;
          return isSelected ? "#fbbf24" : d.fill; // Yellow for selected
        }
        return d.fill;
      })
      .attr("stroke", d => {
        // Thicker stroke for selected node
        if (selectedNode) {
          const isSelected = 
            d.accountId === selectedNode.accountId && 
            d.direction === selectedNode.direction &&
            d.parentId === selectedNode.parentId;
          return isSelected ? "#f59e0b" : d.stroke; // Darker yellow stroke for selected
        }
        return d.stroke;
      })
      .attr("stroke-width", d => {
        if (selectedNode) {
          const isSelected = 
            d.accountId === selectedNode.accountId && 
            d.direction === selectedNode.direction &&
            d.parentId === selectedNode.parentId;
          return isSelected ? 3 : d.strokeWidth; // Thicker stroke for selected
        }
        return d.strokeWidth;
      })
      .on("click", function(event, d) {
        event.stopPropagation();
        
        // Use the node data which now includes parent information
        handleNodeClick(d.accountId, d.direction, d.parentId, filteredTx, d.transactions);
      })
      .on("contextmenu", function(event, d) {
        event.preventDefault();
        event.stopPropagation();
        
        // Show context menu for account focusing
        const accountName = accounts.find(a => a.id === d.accountId)?.name || d.accountId;
        setContextMenu({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          accountId: d.accountId,
          accountName: accountName
        });
      });
    
    nodes.exit().remove();

    const texts = g.selectAll<SVGTextElement, typeof allTexts[0]>(".tree-text")
      .data(allTexts, d => d.id);
    
    texts.enter()
      .append("text")
      .attr("class", "tree-text")
      .attr("dy", "0.32em")
      .style("font-family", "sans-serif")
      .style("paint-order", "stroke")
      .style("stroke", "#fff")
      .style("stroke-width", "3px")
      .style("stroke-linejoin", "round")
      .merge(texts)
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("text-anchor", d => d.anchor)
      .style("font-size", d => d.fontSize)
      .style("fill", d => d.fill)
      .style("font-weight", d => d.fontWeight || "normal")
      .text(d => d.text)
      .each(function(d) {
        // Add red flag icon if flagged
        if (d.flagged) {
          const bbox = (this as SVGTextElement).getBBox();
          d3.select(this.parentNode as SVGGElement)
            .append("text")
            .attr("x", d.anchor === "end" ? d.x - bbox.width - 16 : d.x + bbox.width + 6)
            .attr("y", d.y)
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .style("font-size", "13px")
            .style("fill", "#e11d48")
            .text("\u2691"); // Unicode triangular flag
        }
      });
    
    texts.exit().remove();
  }, [transactions, minAmount, maxAmount, selectedNode, activeAccount]); // Add selectedNode to update highlighting

  // Handle click outside to close context menu
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu?.visible) {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu?.visible]);

  // Handle context menu actions
  const handleFocusAccount = (accountId: string) => {
    if (onActiveAccountChange) {
      onActiveAccountChange(accountId);
    }
    setContextMenu(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative" }}>
      <div style={{ position: 'absolute', top: 8, right: 16, zIndex: 2, display: 'flex', gap: 8 }}>
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
          height: "500px", 
          background: "#f9fafb", 
          borderRadius: 8, 
          border: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}
        onClick={() => setSelectedNode(null)} // Clear selection when clicking background
      >
        <svg ref={svgRef} style={{ cursor: "grab" }} />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 1000,
            minWidth: "160px",
            padding: "4px 0"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "none",
              background: "transparent",
              textAlign: "left",
              cursor: "pointer",
              fontSize: "14px",
              color: "#333"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            onClick={() => handleFocusAccount(contextMenu.accountId)}
          >
            Re-centre on {contextMenu.accountName}
          </button>
        </div>
      )}
      
      {selectedNode && (
        <div className="table-section">
          <div className="grid-container">
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "12px" 
            }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
                Transactions for {accounts.find(a => a.id === selectedNode.accountId)?.name || selectedNode.accountId}
                {selectedNode.direction === "in" && " (Incoming)"}
                {selectedNode.direction === "out" && " (Outgoing)"}
                {selectedNode.direction === "root" && " (All)"}
                {selectedNode.parentId && (
                  <span style={{ fontSize: "14px", fontWeight: "normal", color: "#666" }}>
                    {selectedNode.direction === "out" ? " from " : " to "}
                    {accounts.find(a => a.id === selectedNode.parentId)?.name || selectedNode.parentId}
                  </span>
                )}
              </h3>
              <button 
                onClick={() => setSelectedNode(null)}
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
              transactions={selectedNode.transactions}
              accounts={accounts}
              page={1}
              totalPages={1}
              onPageChange={() => {}}
              onToggleFlag={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TreeGraph;
