"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Icons } from "@/components/ui/icons"
import { City, getCitiesForCountry } from "@/lib/data/cities"

interface CityComboboxProps {
  countryCode: string | { code: string };
  value: City | null;
  onChange: (city: City | null) => void;
  excludeCities?: string[];
}

export function CityCombobox({
  countryCode,
  value,
  onChange,
  excludeCities = []
}: CityComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Get all cities and filter out excluded ones
  const cities = React.useMemo(() => {
    if (!countryCode) return [];
    
    const code = typeof countryCode === 'object' ? countryCode.code : countryCode;
    const allCities = getCitiesForCountry(code);
    
    // Filter out already selected cities
    return allCities.filter(city => !excludeCities.includes(city.code));
  }, [countryCode, excludeCities]);

  // Filter cities based on search query
  const filteredCities = React.useMemo(() => {
    if (!searchQuery) return cities;
    const query = searchQuery.toLowerCase();
    return cities.filter(city => 
      city.label.toLowerCase().includes(query) ||
      city.code.toLowerCase().includes(query)
    );
  }, [cities, searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground"
          )}
        >
          {value ? value.label : "Select city..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search city..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {filteredCities.length === 0 ? (
              <CommandEmpty>No cities found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredCities.map((city) => (
                  <CommandItem
                    key={city.value}
                    value={city.value}
                    onSelect={() => {
                      onChange(city);
                      setOpen(false);
                    }}
                  >
                    {city.label}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value?.code === city.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}