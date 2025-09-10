import { Problem } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProblemCardProps {
  problem: Problem;
  onVote: () => void;
}

export default function ProblemCard({ problem, onVote }: ProblemCardProps) {
  const getCategoryColor = (category: string | null) => {
    if (!category) return "bg-muted text-muted-foreground";
    
    const colors = {
      Technology: "bg-blue-500/20 text-blue-400",
      Healthcare: "bg-green-500/20 text-green-400",
      Environment: "bg-emerald-500/20 text-emerald-400",
      Education: "bg-purple-500/20 text-purple-400",
      Governance: "bg-orange-500/20 text-orange-400",
      Traffic: "bg-red-500/20 text-red-400",
      Other: "bg-muted text-muted-foreground"
    };
    return colors[category as keyof typeof colors] || "bg-muted text-muted-foreground";
  };

  const getSourceIcon = () => {
    if (problem.source === "Reddit") {
      return (
        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
          <i className="fab fa-reddit text-orange-500 text-sm"></i>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
        <i className="fas fa-user text-primary-foreground text-sm"></i>
      </div>
    );
  };

  return (
    <Card className="bg-card border-border hover-lift" data-testid={`card-problem-${problem.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getSourceIcon()}
            <div>
              <span className="text-sm text-muted-foreground" data-testid="text-problem-source">
                {problem.source === "Reddit" ? `r/${problem.subreddit}` : "User Submission"}
              </span>
              {problem.authorUsername && (
                <span className="text-xs text-muted-foreground ml-2" data-testid="text-author-info">
                  • u/{problem.authorUsername} {problem.authorKarma && `(${problem.authorKarma} karma)`}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {problem.category && (
              <Badge className={cn("text-xs", getCategoryColor(problem.category))} data-testid="badge-category">
                {problem.category}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground" data-testid="text-created-at">
              {problem.createdAt ? new Date(problem.createdAt).toLocaleDateString() : "Unknown"}
            </span>
          </div>
        </div>
        
        <h3 className="font-semibold text-lg mb-3" data-testid="text-problem-summary">
          {problem.summary || problem.originalText.substring(0, 200) + "..."}
        </h3>
        
        {problem.keywords && problem.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4" data-testid="keywords-container">
            {problem.keywords.map((keyword, index) => (
              <Badge key={index} variant="secondary" className="text-xs" data-testid={`keyword-${index}`}>
                {keyword}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onVote}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-upvote"
            >
              <ArrowUp className="w-4 h-4 mr-1" />
              <span className="text-sm">{problem.score || 0}</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="button-comment">
              <MessageCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">0</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="button-share">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-green-400">✓ Innovation opportunity</span>
            <Button variant="link" className="text-primary hover:text-primary/80 text-sm p-0" data-testid="button-view-details">
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
