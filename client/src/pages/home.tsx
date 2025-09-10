import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProblemCard from "../components/problem-card";
import ClusterCard from "../components/cluster-card";
import ClusterVisualization from "../components/cluster-visualization";
import EntrepreneurCard from "../components/entrepreneur-card";
import ProblemSubmissionModal from "../components/problem-submission-modal";
import FilterBar from "../components/filter-bar";
import { Problem, Entrepreneur } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, User } from "lucide-react";

type TabType = "problems" | "clusters" | "entrepreneurs";

interface Cluster {
  clusterName: string;
  problemIds: string[];
  commonThemes: string[];
  innovationGaps: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("problems");
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    source: "",
    search: "",
    sortBy: "createdAt",
    order: "desc" as "asc" | "desc",
    page: 1,
    limit: 20
  });
  const [entrepreneurFilters, setEntrepreneurFilters] = useState({
    expertise: "",
    search: ""
  });

  const { toast } = useToast();

  // Fetch problems
  const { data: problems = [], isLoading: problemsLoading } = useQuery<Problem[]>({
    queryKey: ["/api/problems", filters],
    enabled: activeTab === "problems" || activeTab === "clusters",
  });

  // Fetch clusters
  const { data: clusters = [], isLoading: clustersLoading } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
    enabled: activeTab === "clusters",
  });

  // Fetch entrepreneurs
  const { data: entrepreneurs = [], isLoading: entrepreneursLoading } = useQuery<Entrepreneur[]>({
    queryKey: ["/api/entrepreneurs", entrepreneurFilters],
    enabled: activeTab === "entrepreneurs",
  });

  // Load Reddit data mutation
  const loadRedditMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/load-reddit-data", {
        subreddits: ["LifeProTips", "mildlyinfuriating", "YouShouldKnow", "productivity", "personalfinance"]
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to load Reddit data",
        variant: "destructive",
      });
    },
  });

  const handleVote = async (problemId: string) => {
    try {
      await apiRequest("POST", `/api/problems/${problemId}/vote`, {
        userIdentifier: "anonymous"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      toast({
        title: "Vote recorded",
        description: "Thank you for your vote!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record vote",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-background/80 glass-effect border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold gradient-text" data-testid="logo">ProblemMap</div>
              <nav className="hidden md:flex space-x-6 ml-8">
                <button 
                  className={`transition-colors ${activeTab === "problems" ? "text-foreground" : "text-muted-foreground hover:text-primary"}`}
                  onClick={() => setActiveTab("problems")}
                  data-testid="tab-problems"
                >
                  Problems
                </button>
                <button 
                  className={`transition-colors ${activeTab === "clusters" ? "text-foreground" : "text-muted-foreground hover:text-primary"}`}
                  onClick={() => setActiveTab("clusters")}
                  data-testid="tab-clusters"
                >
                  Clusters
                </button>
                <button 
                  className={`transition-colors ${activeTab === "entrepreneurs" ? "text-foreground" : "text-muted-foreground hover:text-primary"}`}
                  onClick={() => setActiveTab("entrepreneurs")}
                  data-testid="tab-entrepreneurs"
                >
                  Entrepreneurs
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setShowSubmissionModal(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-post-problem"
              >
                <Plus className="w-4 h-4 mr-2" />
                Post Problem
              </Button>
              <Button variant="ghost" size="icon" data-testid="button-user-profile">
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Problems Tab */}
        {activeTab === "problems" && (
          <div data-testid="problems-tab">
            {/* Hero Section */}
            <section className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
                Discover Real-World Problems Worth Solving
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                A crowd-sourced platform where everyday people share problems, AI clusters them, and entrepreneurs find validated opportunities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => setShowSubmissionModal(true)}
                  className="bg-primary text-primary-foreground px-8 py-3 hover:bg-primary/90"
                  data-testid="button-post-a-problem"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Post a Problem
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => loadRedditMutation.mutate()}
                  disabled={loadRedditMutation.isPending}
                  className="border-border text-foreground px-8 py-3 hover:bg-muted"
                  data-testid="button-load-reddit-data"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {loadRedditMutation.isPending ? "Loading..." : "Load Reddit Data"}
                </Button>
              </div>
            </section>

            <FilterBar filters={filters} onFiltersChange={setFilters} />

            {/* Problems Feed */}
            <div className="grid gap-6" data-testid="problems-feed">
              {problemsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading problems...</div>
              ) : problems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No problems found.</p>
                  <Button onClick={() => loadRedditMutation.mutate()} data-testid="button-load-sample-data">
                    Load Sample Data from Reddit
                  </Button>
                </div>
              ) : (
                problems.map((problem: Problem) => (
                  <ProblemCard 
                    key={problem.id} 
                    problem={problem} 
                    onVote={() => handleVote(problem.id)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Clusters Tab */}
        {activeTab === "clusters" && (
          <div data-testid="clusters-tab">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-4">Problem Clusters</h2>
              <p className="text-muted-foreground text-lg">Discover recurring pain points and innovation opportunities through AI-powered clustering.</p>
            </div>

            {/* Cluster Stats */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-card border border-border rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2" data-testid="stat-active-clusters">{clusters.length}</div>
                <div className="text-muted-foreground">Active Clusters</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2" data-testid="stat-solution-gaps">
                  {clusters.reduce((acc: number, cluster: Cluster) => acc + cluster.innovationGaps, 0)}
                </div>
                <div className="text-muted-foreground">Innovation Gaps</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-amber-400 mb-2" data-testid="stat-total-problems">
                  {clusters.reduce((acc: number, cluster: Cluster) => acc + cluster.problemIds.length, 0)}
                </div>
                <div className="text-muted-foreground">Total Problems</div>
              </div>
            </div>

            {/* Cluster Network Visualization */}
            {clusters.length > 0 && (
              <div className="mb-8">
                <ClusterVisualization 
                  clusters={clusters} 
                  problems={problems.map(p => ({
                    id: p.id,
                    summary: p.summary || p.originalText.substring(0, 200),
                    category: p.category || 'Other',
                    keywords: p.keywords || []
                  }))} 
                />
              </div>
            )}

            {/* Clusters Grid */}
            <div className="grid md:grid-cols-2 gap-6" data-testid="clusters-grid">
              {clustersLoading ? (
                <div className="col-span-2 text-center py-8 text-muted-foreground">Loading clusters...</div>
              ) : clusters.length === 0 ? (
                <div className="col-span-2 text-center py-8">
                  <p className="text-muted-foreground mb-4">No clusters available. Load some problems first.</p>
                  <Button onClick={() => setActiveTab("problems")} data-testid="button-go-to-problems">
                    Go to Problems
                  </Button>
                </div>
              ) : (
                clusters.map((cluster: Cluster, index: number) => (
                  <ClusterCard key={index} cluster={cluster} />
                ))
              )}
            </div>
          </div>
        )}

        {/* Entrepreneurs Tab */}
        {activeTab === "entrepreneurs" && (
          <div data-testid="entrepreneurs-tab">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-4">Entrepreneur Directory</h2>
              <p className="text-muted-foreground text-lg">Connect with entrepreneurs, startups, and NGOs ready to solve real-world problems.</p>
            </div>

            {/* Entrepreneur Filters */}
            <div className="bg-card rounded-lg p-4 mb-8 border border-border">
              <div className="flex flex-wrap items-center gap-4">
                <Select onValueChange={(value) => setEntrepreneurFilters(prev => ({ ...prev, expertise: value === "all" ? "" : value }))}>
                  <SelectTrigger className="w-48" data-testid="select-expertise-filter">
                    <SelectValue placeholder="All Expertise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Expertise</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Environment">Environment</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Governance">Governance</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
                <div className="ml-auto">
                  <Input
                    type="search"
                    placeholder="Search entrepreneurs..."
                    className="w-64"
                    value={entrepreneurFilters.search}
                    onChange={(e) => setEntrepreneurFilters(prev => ({ ...prev, search: e.target.value }))}
                    data-testid="input-entrepreneur-search"
                  />
                </div>
              </div>
            </div>

            {/* Entrepreneurs Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="entrepreneurs-grid">
              {entrepreneursLoading ? (
                <div className="col-span-3 text-center py-8 text-muted-foreground">Loading entrepreneurs...</div>
              ) : entrepreneurs.length === 0 ? (
                <div className="col-span-3 text-center py-8">
                  <p className="text-muted-foreground">No entrepreneurs found matching your criteria.</p>
                </div>
              ) : (
                entrepreneurs.map((entrepreneur: Entrepreneur) => (
                  <EntrepreneurCard key={entrepreneur.id} entrepreneur={entrepreneur} />
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <ProblemSubmissionModal 
        isOpen={showSubmissionModal} 
        onClose={() => setShowSubmissionModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
          toast({
            title: "Problem submitted successfully!",
            description: "Your problem has been analyzed and added to the feed.",
          });
        }}
      />
    </div>
  );
}
