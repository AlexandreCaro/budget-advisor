import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import { formatCurrency } from '@/lib/utils/currency';

interface ReferenceModalProps {
  open: boolean;
  onClose: () => void;
  category: string;
  estimates: Record<string, any> | undefined;
  selectedTier: string;
  currency: string;
  country: string;
  tripId: string;
  onSelect?: (variant: { price?: number }) => void;
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
  if (!estimates || !estimates[category] || !estimates[category][selectedTier]) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reference Options
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p>View and select reference options for {category} ({selectedTier} tier)</p>
            <p className="text-sm text-muted-foreground mt-2">
              No reference options available for this category.
              Try selecting a different tier or refreshing the estimates.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const estimate = estimates[category][selectedTier];
  const references = estimate.references || [];

  const renderFlightReference = (reference: string) => {
    // Parse flight reference string to extract details
    const [airline, route] = reference.split(': ');
    const isBookingLink = reference.toLowerCase().includes('http');

    if (isBookingLink) {
      return (
        <a
          href={reference}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {reference}
        </a>
      );
    }

    return (
      <div className="flex flex-col space-y-1">
        <span className="font-medium">{airline}</span>
        <span className="text-sm text-muted-foreground">{route}</span>
      </div>
    );
  };

  const renderGeneralReference = (reference: string) => {
    return (
      <div className="text-sm">
        {reference}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Reference Options for {category} ({selectedTier} tier)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Price Range */}
          <div className="p-4 bg-muted/10 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Price Range:</span>
              <span>
                {formatCurrency(estimate.min, currency)} - {formatCurrency(estimate.max, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-medium">Average:</span>
              <span>{formatCurrency(estimate.average, currency)}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-medium">Confidence:</span>
              <span>{(estimate.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* References */}
          <div className="space-y-4">
            <h4 className="font-medium">Available Options:</h4>
            <div className="space-y-4">
              {references.map((reference: string, index: number) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg hover:bg-muted/5 transition-colors"
                >
                  {category === 'flight' 
                    ? renderFlightReference(reference)
                    : renderGeneralReference(reference)
                  }
                  
                  {onSelect && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => onSelect({ price: estimate.average })}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Select this option
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Source */}
          {estimate.source && (
            <div className="text-xs text-muted-foreground mt-4">
              Source: {estimate.source}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 