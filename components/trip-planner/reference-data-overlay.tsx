import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ExternalLink } from "lucide-react"

interface ReferenceDataOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    category: string;
    tier: string;
    source: string;
    min: number;
    max: number;
    average: number;
    confidence: number;
    currency: string;
  };
}

export function ReferenceDataOverlay({
  isOpen,
  onClose,
  data
}: ReferenceDataOverlayProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Reference Data for {data.category}</span>
            <span className="text-sm text-muted-foreground">({data.tier} tier)</span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium">Price Range</h3>
                <p className="text-sm text-muted-foreground">
                  {data.currency} {data.min.toLocaleString()} - {data.max.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Average Cost</h3>
                <p className="text-sm text-muted-foreground">
                  {data.currency} {data.average.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Confidence Level</h3>
                <p className="text-sm text-muted-foreground">
                  {(data.confidence * 100).toFixed(1)}%
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Source</h3>
                <a 
                  href={data.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  View Source <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 