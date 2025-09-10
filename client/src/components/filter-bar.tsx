import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

interface FilterBarProps {
  filters: {
    category: string;
    source: string;
    search: string;
    sortBy: string;
    order: 'asc' | 'desc';
    page: number;
    limit: number;
  };
  onFiltersChange: (filters: any) => void;
}

export default function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value === "all" ? "" : value, page: 1 });
  };

  return (
    <Card className="bg-card rounded-lg mb-8 border-border">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4" data-testid="filter-bar">
          <Select onValueChange={(value) => updateFilter('category', value)} value={filters.category}>
            <SelectTrigger className="w-48" data-testid="select-category-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Healthcare">Healthcare</SelectItem>
              <SelectItem value="Technology">Technology</SelectItem>
              <SelectItem value="Environment">Environment</SelectItem>
              <SelectItem value="Education">Education</SelectItem>
              <SelectItem value="Governance">Governance</SelectItem>
              <SelectItem value="Traffic">Traffic</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <Select onValueChange={(value) => updateFilter('source', value)} value={filters.source}>
            <SelectTrigger className="w-48" data-testid="select-source-filter">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="User">User Submissions</SelectItem>
              <SelectItem value="Reddit">Reddit Posts</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-muted-foreground">Sort by:</label>
            <Select onValueChange={(value) => updateFilter('sortBy', value)} value={filters.sortBy}>
              <SelectTrigger className="w-36" data-testid="select-sort-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Most Recent</SelectItem>
                <SelectItem value="score">Most Upvoted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="ml-auto relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search problems..."
              className="w-64 pl-10"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              data-testid="input-search-problems"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
