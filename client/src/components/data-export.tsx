import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, FileJson, FileText, BarChart3, Filter } from "lucide-react";

type ExportType = "problems" | "clusters" | "analytics";
type ExportFormat = "json" | "csv";

interface ExportFilters {
  category: string;
  source: string;
  search: string;
}

export default function DataExport() {
  const [exportType, setExportType] = useState<ExportType>("problems");
  const [format, setFormat] = useState<ExportFormat>("json");
  const [filters, setFilters] = useState<ExportFilters>({
    category: "",
    source: "",
    search: "",
  });
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Build URL with filters
      const params = new URLSearchParams({ format });
      if (filters.category && filters.category !== "all") params.append("category", filters.category);
      if (filters.source && filters.source !== "all") params.append("source", filters.source);
      if (filters.search.trim()) params.append("search", filters.search.trim());
      
      const url = `/api/export/${exportType}?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Get filename from Content-Disposition header or create one
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${exportType}-${new Date().toISOString().split('T')[0]}.${format}`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      const filtersApplied = Object.values(filters).some(v => v.trim() !== "");
      toast({
        title: "Export successful",
        description: `${exportType} data exported as ${format.toUpperCase()}${filtersApplied ? " (filtered)" : ""}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getExportDescription = () => {
    const hasFilters = Object.values(filters).some(v => v.trim() !== "");
    const filterText = hasFilters ? " (with applied filters)" : "";
    
    switch (exportType) {
      case "problems":
        return `Export problems with summaries, categories, keywords, and voting data${filterText}`;
      case "clusters":
        return `Export problem clusters with themes, innovation gaps, and associated problems${filterText}`;
      case "analytics":
        return `Export comprehensive analytics including summaries, statistics, and trends${filterText}`;
      default:
        return "";
    }
  };

  const getIcon = () => {
    switch (exportType) {
      case "problems":
        return <FileText className="w-5 h-5" />;
      case "clusters":
        return <Download className="w-5 h-5" />;
      case "analytics":
        return <BarChart3 className="w-5 h-5" />;
      default:
        return <Download className="w-5 h-5" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-6 h-6" />
          Export Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Type</label>
            <Select value={exportType} onValueChange={(value: ExportType) => setExportType(value)}>
              <SelectTrigger data-testid="select-export-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="problems">Problems Data</SelectItem>
                <SelectItem value="clusters">Problem Clusters</SelectItem>
                <SelectItem value="analytics">Analytics Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <Select value={format} onValueChange={(value: ExportFormat) => setFormat(value)}>
              <SelectTrigger data-testid="select-export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    JSON
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    CSV
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Section */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <h4 className="font-medium">Filter Data</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category-filter">Category</Label>
              <Select 
                value={filters.category} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger data-testid="select-export-category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Environment">Environment</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Governance">Governance</SelectItem>
                  <SelectItem value="Traffic">Traffic</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-filter">Source</Label>
              <Select 
                value={filters.source} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, source: value }))}
              >
                <SelectTrigger data-testid="select-export-source">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sources</SelectItem>
                  <SelectItem value="User">User Submissions</SelectItem>
                  <SelectItem value="Reddit">Reddit Posts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="search-filter">Search Keywords</Label>
            <Input
              id="search-filter"
              placeholder="Filter by keywords or problem content..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              data-testid="input-export-search"
            />
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg border">
          <div className="flex items-start gap-3">
            <div className="text-muted-foreground mt-1">
              {getIcon()}
            </div>
            <div>
              <h4 className="font-medium mb-1">Export Description</h4>
              <p className="text-sm text-muted-foreground">
                {getExportDescription()}
              </p>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleExport} 
          disabled={isExporting}
          className="w-full"
          data-testid="button-export"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export {exportType} as {format.toUpperCase()}
              {Object.values(filters).some(v => v.trim() !== "") && (
                <span className="ml-2 px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                  Filtered
                </span>
              )}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}