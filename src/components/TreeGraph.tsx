import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { accounts, formatCurrencyShort } from "../data";
import type { Transaction } from "../data";
import TransactionsTable from "./TransactionsTable";

interface TreeGraphProps {
  transactions: Transaction[];
  activeAccount: string;
  minAmount: number;
  maxAmount: number;
}

interface TreeNode {
  id: string;
  name: string;
  direction: "root" | "in" | "out";
  value: number;
  children: TreeNode[];
}

function aggregateEdges(transactions: Transaction[], direction: "in" | "out", accountId: string) {
  // Aggregate by counterparty
  const map = new Map<string, { value: number; txCount: number }>();
  transactions.forEach((tx) => {
    let counterparty = null;
    if (direction === "out" && tx.from === accountId) counterparty = tx.to;
    if (direction === "in" && tx.to === accountId) counterparty = tx.from;
    if (counterparty) {
      if (!map.has(counterparty)) map.set(counterparty, { value: 0, txCount: 0 });
      map.get(counterparty)!.value += tx.amount;
      map.get(counterparty)!.txCount += 1;
    }
  });
  return Array.from(map.entries()).map(([id, { value, txCount }]) => ({ id, value, txCount }));
}

// Recursively build outgoing or incoming tree
function buildDirectionalTree(transactions: Transaction[], accountId: string, direction: "in" | "out", visited = new Set<string>(), depth = 0): TreeNode | null {
  if (visited.has(accountId) || depth > 3) return null; // Prevent cycles and limit depth
  visited.add(accountId);
  const agg = aggregateEdges(transactions, direction, accountId);
  if (agg.length === 0) return null; // No connections
  
  const newVisited = new Set(visited);
  return {
    id: accountId,
    name: accounts.find((a) => a.id === accountId)?.name || accountId,
    direction,
    value: agg.reduce((sum, a) => sum + a.value, 0),
    children: agg
      .slice(0, 5) // Limit to 5 children per node
      .map((a) => buildDirectionalTree(transactions, a.id, direction, newVisited, depth + 1))
      .filter((child): child is TreeNode => child !== null),
  };
}

function buildFullTree(transactions: Transaction[], accountId: string): TreeNode {
  const outTree = buildDirectionalTree(transactions, accountId, "out");
  const inTree = buildDirectionalTree(transactions, accountId, "in");
  
  return {
    id: accountId,
    name: accounts.find((a) => a.id === accountId)?.name || accountId,
    direction: "root",
    value: 0,
    children: [outTree, inTree].filter((child): child is TreeNode => child !== null),
  };
}

const NODE_RADIUS = 4;

const TreeGraph: React.FC<TreeGraphProps> = ({ transactions, activeAccount, minAmount, maxAmount }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const dimensionsRef = useRef<{ width: number; height: number } | null>(null);
  
  // State for selected node and its transactions
  const [selectedNode, setSelectedNode] = useState<{
    accountId: string;
    direction: "in" | "out" | "root";
    transactions: Transaction[];
  } | null>(null);

  // Function to get transactions for a specific node
  const getNodeTransactions = (accountId: string, direction: "in" | "out", filteredTx: Transaction[]): Transaction[] => {
    if (direction === "out") {
      return filteredTx.filter(tx => tx.from === activeAccount && tx.to === accountId);
    } else {
      return filteredTx.filter(tx => tx.to === activeAccount && tx.from === accountId);
    }
  };

  // Function to handle node click
  const handleNodeClick = (accountId: string, direction: "in" | "out" | "root", filteredTx: Transaction[]) => {
    if (direction === "root") {
      // For root node, show all transactions involving the active account
      const rootTransactions = filteredTx.filter(tx => 
        tx.from === activeAccount || tx.to === activeAccount
      );
      setSelectedNode({ accountId, direction, transactions: rootTransactions });
    } else {
      const nodeTransactions = getNodeTransactions(accountId, direction, filteredTx);
      setSelectedNode({ accountId, direction, transactions: nodeTransactions });
    }
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

    // Collect all nodes and links data with stable IDs
    const allNodes: Array<{id: string, x: number, y: number, r: number, fill: string, stroke: string, strokeWidth: number}> = [];
    const allLinks: Array<{id: string, d: string}> = [];
    const allTexts: Array<{id: string, x: number, y: number, text: string, anchor: string, fontSize: string, fill: string, fontWeight?: string}> = [];

    // Outgoing (right) subtree
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
      outRoot.descendants().forEach((d, i) => {
        allNodes.push({
          id: `out-${d.data.id}`,
          x: d.y!,
          y: d.x!,
          r: NODE_RADIUS,
          fill: "#fff",
          stroke: "#555",
          strokeWidth: 1.5
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
          text: formatCurrencyShort(d.data.value),
          anchor: "start",
          fontSize: "9px",
          fill: "#666"
        });
      });
    }
    
    // Incoming (left) subtree
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
      inRoot.descendants().forEach((d, i) => {
        allNodes.push({
          id: `in-${d.data.id}`,
          x: d.y!,
          y: d.x!,
          r: NODE_RADIUS,
          fill: "#fff",
          stroke: "#555",
          strokeWidth: 1.5
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
          text: formatCurrencyShort(d.data.value),
          anchor: "end",
          fontSize: "9px",
          fill: "#666"
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
      strokeWidth: 2
    });
    
    allTexts.push({
      id: `root-text-${activeAccount}`,
      x: WIDTH / 2,
      y: HEIGHT / 2 - 12,
      text: treeData.name,
      anchor: "middle",
      fontSize: "12px",
      fill: "#000",
      fontWeight: "bold"
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
        // Highlight selected node
        if (selectedNode) {
          const isSelected = 
            (d.id.startsWith("root-") && selectedNode.direction === "root") ||
            (d.id.startsWith("out-") && d.id === `out-${selectedNode.accountId}` && selectedNode.direction === "out") ||
            (d.id.startsWith("in-") && d.id === `in-${selectedNode.accountId}` && selectedNode.direction === "in");
          return isSelected ? "#fbbf24" : d.fill; // Yellow for selected
        }
        return d.fill;
      })
      .attr("stroke", d => {
        // Thicker stroke for selected node
        if (selectedNode) {
          const isSelected = 
            (d.id.startsWith("root-") && selectedNode.direction === "root") ||
            (d.id.startsWith("out-") && d.id === `out-${selectedNode.accountId}` && selectedNode.direction === "out") ||
            (d.id.startsWith("in-") && d.id === `in-${selectedNode.accountId}` && selectedNode.direction === "in");
          return isSelected ? "#f59e0b" : d.stroke; // Darker yellow stroke for selected
        }
        return d.stroke;
      })
      .attr("stroke-width", d => {
        if (selectedNode) {
          const isSelected = 
            (d.id.startsWith("root-") && selectedNode.direction === "root") ||
            (d.id.startsWith("out-") && d.id === `out-${selectedNode.accountId}` && selectedNode.direction === "out") ||
            (d.id.startsWith("in-") && d.id === `in-${selectedNode.accountId}` && selectedNode.direction === "in");
          return isSelected ? 3 : d.strokeWidth; // Thicker stroke for selected
        }
        return d.strokeWidth;
      })
      .on("click", function(event, d) {
        event.stopPropagation();
        
        // Determine the direction and account ID from the node ID
        if (d.id.startsWith("root-")) {
          handleNodeClick(activeAccount, "root", filteredTx);
        } else if (d.id.startsWith("out-")) {
          const accountId = d.id.replace("out-", "");
          handleNodeClick(accountId, "out", filteredTx);
        } else if (d.id.startsWith("in-")) {
          const accountId = d.id.replace("in-", "");
          handleNodeClick(accountId, "in", filteredTx);
        }
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
      .text(d => d.text);
    
    texts.exit().remove();
  }, [transactions, minAmount, maxAmount, selectedNode]); // Add selectedNode to update highlighting

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
