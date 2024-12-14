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
import { countries } from "@/lib/data/countries"

interface CountryComboboxProps {
  value: string | null
  onChange: (code: string) => void
  error?: { error: boolean }
}

export function CountryCombobox({
  value,
  onChange,
  error
}: CountryComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Get the selected country object based on the code
  const selectedCountry = React.useMemo(() => 
    countries.find(country => country.code === value),
    [value]
  )

  // Filter countries based on search query
  const filteredCountries = React.useMemo(() => {
    if (!searchQuery) return countries
    const query = searchQuery.toLowerCase()
    return countries.filter(country => 
      country.label.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const handleSelect = (code: string) => {
    console.log("Selected country code:", code); // Should log just the code
    onChange(code);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            error?.error && "border-red-500",
            !selectedCountry && "text-muted-foreground"
          )}
        >
          {selectedCountry?.label || "Select country..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search country..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {filteredCountries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.code}
                  onSelect={handleSelect}
                >
                  {country.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedCountry?.code === country.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 