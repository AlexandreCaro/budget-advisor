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
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface LocationOption {
  value: string
  label: string
  lat?: number
  lng?: number
  city?: string
  airport?: string
  country?: string
}

interface LocationComboboxProps {
  value: string | null
  onChange: (value: string) => void
  options: LocationOption[]
  placeholder?: string
  error?: { error: boolean; message?: string }
  disabled?: boolean
  loading?: boolean
}

export function LocationCombobox({
  value,
  onChange,
  options,
  placeholder = "Select location...",
  error,
  disabled,
  loading
}: LocationComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = React.useMemo(() => 
    options.find(option => option.value === value),
    [options, value]
  )

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
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          {loading ? (
            <span className="text-muted-foreground">Loading locations...</span>
          ) : value && selectedOption ? (
            selectedOption.label
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search locations..." />
          <CommandEmpty>
            {loading ? "Loading..." : "No location found."}
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  {option.city && option.country && (
                    <span className="text-xs text-muted-foreground">
                      {option.city}, {option.country}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 