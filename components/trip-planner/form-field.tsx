import React from 'react';
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  id: string
  label: string
  type?: string
  value: string | number
  onChange: (value: string) => void
  error?: { error: boolean; message?: string } | null
  required?: boolean
  className?: string
  options?: Array<{ value: string; label: string }>
  showValidation?: boolean
}

export function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  required,
  className,
  options,
  showValidation = true
}: FormFieldProps) {
  const isInvalid = showValidation && error?.error;
  
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={isInvalid ? "text-red-500" : ""}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {type === "select" && options ? (
        <Select 
          value={value.toString()} 
          onValueChange={onChange}
        >
          <SelectTrigger className={cn(
            isInvalid && "border-red-500 shake-animation invalid-input"
          )}>
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            className,
            isInvalid && "border-red-500 shake-animation invalid-input"
          )}
          required={required}
          aria-invalid={isInvalid}
        />
      )}
      {isInvalid && error.message && (
        <p className="text-sm text-red-500 animate-in fade-in slide-in-from-top-1">
          {error.message}
        </p>
      )}
    </div>
  );
} 