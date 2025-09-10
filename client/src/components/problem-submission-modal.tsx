import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ProblemSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProblemSubmissionModal({ isOpen, onClose, onSuccess }: ProblemSubmissionModalProps) {
  const [problemText, setProblemText] = useState("");
  const [category, setCategory] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const { toast } = useToast();

  const submitProblemMutation = useMutation({
    mutationFn: async (data: { originalText: string; source: string; category?: string }) => {
      const response = await apiRequest("POST", "/api/problems", data);
      return response.json();
    },
    onSuccess: (data) => {
      setProblemText("");
      setCategory("");
      setIsAnonymous(false);
      onClose();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit problem. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (problemText.length < 50) {
      toast({
        title: "Error",
        description: "Problem description must be at least 50 characters long.",
        variant: "destructive",
      });
      return;
    }

    submitProblemMutation.mutate({
      originalText: problemText,
      source: "User",
      category: category || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="modal-problem-submission">
        <DialogHeader>
          <DialogTitle>Submit a Problem</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="problem-text">Describe the problem</Label>
            <Textarea
              id="problem-text"
              rows={4}
              placeholder="Describe the problem you're facing in detail. What specific challenges do you encounter? How does it affect you or others?"
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              className="mt-2 resize-none"
              data-testid="textarea-problem-description"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {problemText.length}/50 minimum characters
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category (AI-suggested)</Label>
              <Select onValueChange={setCategory} value={category}>
                <SelectTrigger className="mt-2" data-testid="select-problem-category">
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Environment">Environment</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Governance">Governance</SelectItem>
                  <SelectItem value="Traffic">Traffic</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="privacy">Privacy</Label>
              <Select onValueChange={(value) => setIsAnonymous(value === "anonymous")} value={isAnonymous ? "anonymous" : "public"}>
                <SelectTrigger className="mt-2" data-testid="select-privacy-setting">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public (recommended)</SelectItem>
                  <SelectItem value="anonymous">Anonymous</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* AI Processing Preview */}
          <div className="bg-muted/30 border border-border rounded-lg p-4">
            <h4 className="font-medium mb-2 text-sm">AI Processing Preview</h4>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Summary:</strong> <span className="italic">Will be generated after submission...</span></p>
              <p><strong>Keywords:</strong> <span className="italic">Will be extracted automatically...</span></p>
              <p><strong>Similar Problems:</strong> <span className="italic">Will check for existing solutions...</span></p>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4">
            <Button type="button" variant="ghost" onClick={onClose} data-testid="button-cancel-submission">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitProblemMutation.isPending || problemText.length < 50}
              data-testid="button-submit-problem"
            >
              {submitProblemMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Problem
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
