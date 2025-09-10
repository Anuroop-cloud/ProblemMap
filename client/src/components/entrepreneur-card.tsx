import { Entrepreneur } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";

interface EntrepreneurCardProps {
  entrepreneur: Entrepreneur;
}

export default function EntrepreneurCard({ entrepreneur }: EntrepreneurCardProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getGradientByName = (name: string) => {
    const gradients = [
      "from-blue-500 to-purple-600",
      "from-green-500 to-teal-600",
      "from-purple-500 to-pink-600",
      "from-orange-500 to-red-600",
      "from-teal-500 to-cyan-600",
      "from-indigo-500 to-blue-600",
    ];
    const index = name.length % gradients.length;
    return gradients[index];
  };

  const handleContact = () => {
    window.location.href = `mailto:${entrepreneur.email}`;
  };

  return (
    <Card className="bg-card border-border hover-lift" data-testid={`card-entrepreneur-${entrepreneur.id}`}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className={`w-12 h-12 bg-gradient-to-br ${getGradientByName(entrepreneur.name)} rounded-full flex items-center justify-center text-white font-semibold`}>
            {getInitials(entrepreneur.name)}
          </div>
          <div>
            <h3 className="font-semibold text-lg" data-testid="text-entrepreneur-name">{entrepreneur.name}</h3>
            <p className="text-sm text-muted-foreground" data-testid="text-entrepreneur-organization">{entrepreneur.organization}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3" data-testid="expertise-container">
          {entrepreneur.expertise.map((skill, index) => (
            <Badge key={index} className="text-xs" variant="secondary" data-testid={`expertise-${index}`}>
              {skill}
            </Badge>
          ))}
        </div>
        
        <p className="text-sm text-muted-foreground mb-4" data-testid="text-entrepreneur-description">
          {entrepreneur.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground" data-testid="text-solved-problems">
            <span>✓ Available for new projects</span>
          </div>
          <Button 
            onClick={handleContact}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-contact-entrepreneur"
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
