import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExternalLink, ThumbsUp, ThumbsDown, BookmarkPlus, Check, X } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ReferenceItem {
  name: string;
  price: number;
  description: string;
  url: string;
  id: string;
  departureTime?: string;
  arrivalTime?: string;
  airline?: string;
  stops?: number;
  duration?: string;
  bookingClass?: string;
}

interface TierEstimate {
  min: number;
  max: number;
  average: number;
  confidence: number;
  source: string;
  references: string[];
}

interface CategoryEstimates {
  budget: TierEstimate;
  medium: TierEstimate;
  premium: TierEstimate;
}

interface ReferenceModalProps {
  open: boolean;
  onClose: () => void;
  category: string;
  estimates: Record<string, CategoryEstimates>;
  selectedTier: 'budget' | 'medium' | 'premium';
  currency: string;
  country: string;
  tripId: string;
  onSelect?: (variant: ReferenceItem) => void;
}

export function ReferenceModal({
  open,
  onClose,
  category,
  estimates,
  selectedTier,
  currency,
  country,
  tripId,
  onSelect
}: ReferenceModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [references, setReferences] = useState<ReferenceItem[]>([]);

  useEffect(() => {
    if (!open || !estimates || !category || !selectedTier) return;

    const loadReferences = async () => {
      try {
        setIsLoading(true);
        
        // Get the estimate for the current category and tier
        const estimate = estimates[category.toLowerCase()]?.[selectedTier];
        if (!estimate) {
          console.warn('No estimate found for', { category, selectedTier });
          return;
        }

        // If we have references in the estimate, use them
        if (estimate.references && estimate.references.length > 0) {
          // Convert reference URLs to ReferenceItems
          const items: ReferenceItem[] = estimate.references.map((ref, index) => ({
            id: `${category}-${selectedTier}-${index}`,
            name: `${category} Option ${index + 1}`,
            price: estimate.average,
            description: `Reference from ${estimate.source}`,
            url: ref
          }));
          setReferences(items);
          return;
        }

        // If no references, try to fetch from API
        const response = await fetch(`/api/references?category=${category}&country=${country}&tripId=${tripId}`);
        if (!response.ok) {
          throw new Error('Failed to load references');
        }
        const data = await response.json();
        setReferences(data.references || []);
      } catch (error) {
        console.error('Error loading references:', error);
        toast({
          title: "Error",
          description: "Failed to load reference options. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadReferences();
  }, [open, category, selectedTier, country, tripId, estimates]);

  const handleSelect = (reference: ReferenceItem) => {
    if (onSelect) {
      onSelect(reference);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reference Options</DialogTitle>
          <DialogDescription>
            View and select reference options for {category} ({selectedTier} tier)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce"></div>
              </div>
            </div>
          ) : references.length > 0 ? (
            <div className="grid gap-4">
              {references.map((reference) => (
                <Card key={reference.id} className="w-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">
                          {reference.name}
                        </CardTitle>
                        {reference.description && (
                          <CardDescription>
                            {reference.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">
                          {formatCurrency(reference.price, currency)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Flight-specific details */}
                    {category === 'flight' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          {reference.departureTime && (
                            <div>
                              <h4 className="text-sm font-medium">Departure</h4>
                              <p className="text-sm text-muted-foreground">{reference.departureTime}</p>
                            </div>
                          )}
                          {reference.arrivalTime && (
                            <div>
                              <h4 className="text-sm font-medium">Arrival</h4>
                              <p className="text-sm text-muted-foreground">{reference.arrivalTime}</p>
                            </div>
                          )}
                        </div>
                        {(reference.duration || reference.stops !== undefined) && (
                          <div className="flex items-center justify-between text-sm">
                            {reference.duration && (
                              <div>
                                <span className="font-medium">Duration:</span> {reference.duration}
                              </div>
                            )}
                            {reference.stops !== undefined && (
                              <div>
                                <span className="font-medium">Stops:</span> {reference.stops === 0 ? 'Direct' : `${reference.stops} stop${reference.stops > 1 ? 's' : ''}`}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleSelect(reference)}
                      >
                        Select Option
                      </Button>
                      <a
                        href={reference.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full"
                      >
                        <Button variant="outline" className="w-full">
                          View Details <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No reference options available for this category.</p>
              <p className="text-sm mt-2">Try selecting a different tier or refreshing the estimates.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 