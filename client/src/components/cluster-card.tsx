import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Lightbulb } from "lucide-react";

interface ClusterCardProps {
  cluster: {
    clusterName: string;
    problemIds: string[];
    commonThemes: string[];
    innovationGaps: number;
  };
}

export default function ClusterCard({ cluster }: ClusterCardProps) {
  const getOpportunityLevel = (gaps: number) => {
    if (gaps >= 7) return { label: "Critical Need", color: "bg-red-500/20 text-red-400" };
    if (gaps >= 5) return { label: "High Opportunity", color: "bg-amber-500/20 text-amber-400" };
    if (gaps >= 3) return { label: "Growing Trend", color: "bg-green-500/20 text-green-400" };
    return { label: "Emerging", color: "bg-purple-500/20 text-purple-400" };
  };

  const getIconByName = (name: string) => {
    if (name.toLowerCase().includes("schedul") || name.toLowerCase().includes("time")) {
      return <Calendar className="text-blue-400" />;
    }
    if (name.toLowerCase().includes("sustain") || name.toLowerCase().includes("environment")) {
      return <i className="fas fa-leaf text-green-400"></i>;
    }
    if (name.toLowerCase().includes("health")) {
      return <i className="fas fa-heart text-red-400"></i>;
    }
    if (name.toLowerCase().includes("educat")) {
      return <i className="fas fa-graduation-cap text-purple-400"></i>;
    }
    return <TrendingUp className="text-blue-400" />;
  };

  const opportunity = getOpportunityLevel(cluster.innovationGaps);

  return (
    <Card className="bg-card border-border hover-lift" data-testid={`card-cluster-${cluster.clusterName.replace(/\s+/g, '-').toLowerCase()}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              {getIconByName(cluster.clusterName)}
            </div>
            <div>
              <h3 className="font-semibold text-lg" data-testid="text-cluster-name">{cluster.clusterName}</h3>
              <span className="text-sm text-muted-foreground" data-testid="text-problem-count">
                {cluster.problemIds.length} related problems
              </span>
            </div>
          </div>
          <Badge className={opportunity.color} data-testid="badge-opportunity-level">
            {opportunity.label}
          </Badge>
        </div>
        
        <p className="text-muted-foreground mb-4" data-testid="text-cluster-description">
          Problems related to {cluster.commonThemes.join(", ").toLowerCase()} with significant opportunities for innovative solutions.
        </p>
        
        <div className="flex flex-wrap gap-2 mb-4" data-testid="themes-container">
          {cluster.commonThemes.slice(0, 4).map((theme, index) => (
            <Badge key={index} variant="secondary" className="text-xs" data-testid={`theme-${index}`}>
              {theme}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span data-testid="text-innovation-gaps">
              <Lightbulb className="w-4 h-4 inline mr-1" />
              {cluster.innovationGaps} solution gaps
            </span>
            <span data-testid="text-demand-level">
              📈 {cluster.innovationGaps > 5 ? "High" : "Medium"} demand
            </span>
          </div>
          <Button variant="link" className="text-primary hover:text-primary/80 font-medium p-0" data-testid="button-explore-cluster">
            Explore Cluster
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
