import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface ClusterData {
  clusterName: string;
  problemIds: string[];
  commonThemes: string[];
  innovationGaps: number;
}

interface Problem {
  id: string;
  summary: string;
  category: string;
  keywords: string[];
}

interface ClusterVisualizationProps {
  clusters: ClusterData[];
  problems: Problem[];
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  type: "cluster" | "problem";
  label: string;
  clusterId?: string;
  category?: string;
  innovationGaps?: number;
  size: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

export default function ClusterVisualization({ clusters, problems }: ClusterVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const getCategoryColor = (category?: string) => {
    const colors = {
      Technology: "#3B82F6",
      Healthcare: "#10B981", 
      Environment: "#059669",
      Education: "#8B5CF6",
      Governance: "#F59E0B",
      Traffic: "#EF4444",
      Other: "#6B7280"
    };
    return colors[category as keyof typeof colors] || "#6B7280";
  };

  const getInnovationColor = (gaps: number) => {
    if (gaps >= 7) return "#EF4444"; // Critical - Red
    if (gaps >= 5) return "#F59E0B"; // High - Orange
    if (gaps >= 3) return "#10B981"; // Medium - Green
    return "#8B5CF6"; // Low - Purple
  };

  useEffect(() => {
    if (!svgRef.current || clusters.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;
    
    svg.attr("width", width).attr("height", height);

    // Create nodes and links
    const nodes: Node[] = [];
    const links: Link[] = [];

    // Add cluster nodes
    clusters.forEach(cluster => {
      nodes.push({
        id: cluster.clusterName,
        type: "cluster",
        label: cluster.clusterName,
        innovationGaps: cluster.innovationGaps,
        size: Math.max(30, cluster.problemIds.length * 8)
      });

      // Add problem nodes and links
      cluster.problemIds.forEach(problemId => {
        const problem = problems.find(p => p.id === problemId);
        if (problem) {
          nodes.push({
            id: problem.id,
            type: "problem",
            label: problem.summary?.substring(0, 50) + "..." || "Problem",
            clusterId: cluster.clusterName,
            category: problem.category,
            size: 15
          });

          links.push({
            source: cluster.clusterName,
            target: problem.id
          });
        }
      });
    });

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        const { transform } = event;
        setTransform(transform);
        g.attr("transform", transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Main group for all elements
    const g = svg.append("g");

    // Create force simulation
    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => (d as Node).size + 5));

    // Create links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#374151")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    // Create nodes
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add circles for nodes
    const circles = node.append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => {
        if (d.type === "cluster") {
          return getInnovationColor(d.innovationGaps || 0);
        } else {
          return getCategoryColor(d.category);
        }
      })
      .attr("stroke", "#1F2937")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))");

    // Add labels
    const labels = node.append("text")
      .text(d => {
        if (d.type === "cluster") {
          return d.label.length > 20 ? d.label.substring(0, 20) + "..." : d.label;
        } else {
          return d.label.length > 15 ? d.label.substring(0, 15) + "..." : d.label;
        }
      })
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("font-size", d => d.type === "cluster" ? "12px" : "10px")
      .attr("font-weight", d => d.type === "cluster" ? "bold" : "normal")
      .attr("fill", "#F9FAFB")
      .style("pointer-events", "none");

    // Add click handlers
    node.on("click", (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
    });

    // Clear selection when clicking on empty space
    svg.on("click", () => {
      setSelectedNode(null);
    });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!);

      node.attr("transform", d => `translate(${d.x!},${d.y!})`);
    });

    return () => {
      simulation.stop();
    };
  }, [clusters, problems]);

  const resetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(750).call(
      zoomBehaviorRef.current.transform,
      d3.zoomIdentity
    );
  };

  const zoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      zoomBehaviorRef.current.scaleBy,
      1.5
    );
  };

  const zoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      zoomBehaviorRef.current.scaleBy,
      1 / 1.5
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main visualization */}
      <div className="lg:col-span-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Problem Clusters Network</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={resetZoom} data-testid="button-reset-zoom">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={zoomIn} data-testid="button-zoom-in">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={zoomOut} data-testid="button-zoom-out">
                  <ZoomOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Interactive network showing problem clusters and their relationships. 
              Drag nodes to explore, click to see details.
            </p>
          </CardHeader>
          <CardContent>
            <div className="relative bg-slate-900 rounded-lg overflow-hidden">
              <svg
                ref={svgRef}
                className="w-full h-96"
                data-testid="cluster-visualization-svg"
              />
            </div>
            
            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Node Types</h4>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-6 h-6 rounded-full bg-orange-500"></div>
                    <span>Clusters</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Problems</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2">Innovation Level</h4>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span>Critical</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span>High</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Medium</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details panel */}
      <div>
        <Card className="bg-card border-border sticky top-4">
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              <div data-testid="node-details">
                <h3 className="font-semibold mb-2" data-testid="node-title">
                  {selectedNode.label}
                </h3>
                
                {selectedNode.type === "cluster" ? (
                  <div className="space-y-3">
                    <Badge 
                      className={`${
                        selectedNode.innovationGaps! >= 7 ? "bg-red-500/20 text-red-400" :
                        selectedNode.innovationGaps! >= 5 ? "bg-amber-500/20 text-amber-400" :
                        selectedNode.innovationGaps! >= 3 ? "bg-green-500/20 text-green-400" :
                        "bg-purple-500/20 text-purple-400"
                      }`}
                      data-testid="innovation-badge"
                    >
                      Innovation Level: {selectedNode.innovationGaps}/10
                    </Badge>
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Problems in cluster:</p>
                      <p className="text-sm font-medium" data-testid="problem-count">
                        {clusters.find(c => c.clusterName === selectedNode.id)?.problemIds.length || 0} problems
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Common themes:</p>
                      <div className="flex flex-wrap gap-1">
                        {clusters.find(c => c.clusterName === selectedNode.id)?.commonThemes.slice(0, 3).map((theme, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Badge className="bg-blue-500/20 text-blue-400" data-testid="category-badge">
                      {selectedNode.category || "Uncategorized"}
                    </Badge>
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Part of cluster:</p>
                      <p className="text-sm font-medium" data-testid="parent-cluster">
                        {selectedNode.clusterId}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground" data-testid="full-problem-text">
                        {problems.find(p => p.id === selectedNode.id)?.summary || "No summary available"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8" data-testid="no-selection">
                <Maximize2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Click on a cluster or problem to see details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}