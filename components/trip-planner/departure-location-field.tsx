"use client"

import { useState, useMemo, useEffect } from 'react'
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getAllAirports, type Airport } from '@/lib/data/airports'

interface DepartureLocationFieldProps {
  value: Airport | null | undefined;
  onChange: (location: Airport | null) => void;
  error?: { error: boolean; message?: string };
}

export function DepartureLocationField({ value, onChange, error }: DepartureLocationFieldProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [isDetecting, setIsDetecting] = useState(false)

  // Get all airports once
  const airports = useMemo(() => getAllAirports(), [])

  // Filter airports based on search value
  const filteredAirports = useMemo(() => {
    const search = searchValue.toLowerCase()
    return airports.filter(airport => 
      airport.city.toLowerCase().includes(search) ||
      airport.airport.toLowerCase().includes(search) ||
      airport.code.toLowerCase().includes(search)
    )
  }, [airports, searchValue])

  // Format display value
  const displayValue = useMemo(() => {
    if (!value) return '';
    return `${value.city} (${value.code})`;
  }, [value]);

  const handleSelect = (airport: Airport) => {
    onChange(airport);
    setOpen(false);
    setSearchValue('');
  };

  // Auto-detect location on component mount
  useEffect(() => {
    const detectLocation = async () => {
      if (!value) {  // Only detect if no location is set
        setIsDetecting(true);
        try {
          // First get user's location using our IP-based service
          const locationResponse = await fetch('/api/location/detect');
          const locationData = await locationResponse.json();

          if (locationData.error) {
            throw new Error(locationData.error);
          }

          // Then find nearest airport
          const response = await fetch(`/api/locations/search?nearest=true&lat=${locationData.lat}&lng=${locationData.lng}`);
          const data = await response.json();

          if (data) {
            const matchingAirport = airports.find(airport => airport.code === data.code);
            if (matchingAirport) {
              onChange(matchingAirport);
            }
          }
        } catch (error) {
          console.error('Error detecting location:', error);
        } finally {
          setIsDetecting(false);
        }
      }
    };

    detectLocation();
  }, [onChange, value, airports]);

  return (
    <div className="space-y-2">
      <Label>Departure Location</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              error?.error && "border-red-500",
              !value && "text-muted-foreground"
            )}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Detecting nearest airport...
              </div>
            ) : (
              displayValue || "Select departure location..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="flex flex-col space-y-2 p-2">
            <Input
              placeholder="Search airports..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-9"
            />
          </div>
          <ScrollArea className="h-[200px]">
            {filteredAirports.map((airport) => (
              <Button
                key={airport.code}
                variant="ghost"
                role="option"
                className={cn(
                  "w-full justify-start font-normal",
                  value?.code === airport.code && "bg-accent"
                )}
                onClick={() => handleSelect(airport)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value?.code === airport.code ? "opacity-100" : "opacity-0"
                  )}
                />
                {airport.city} ({airport.code})
              </Button>
            ))}
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {error?.error && (
        <p className="text-sm text-red-500">{error.message}</p>
      )}
    </div>
  );
} 