import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { FieldState } from "./form-validation"

interface FormFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: FieldState | null
  required?: boolean
  type?: string
}

export function FormField({
  id,
  label,
  value,
  onChange,
  error,
  required = false,
  type = "text"
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(error?.className)}
      />
      {error?.message && (
        <p className="text-sm text-red-500">{error.message}</p>
      )}
    </div>
  )
} 