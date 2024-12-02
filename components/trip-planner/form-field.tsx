import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FormFieldProps {
  id: string
  label: string
  error?: string
  type?: string
  value: string
  onChange: (value: string) => void
  className?: string
  required?: boolean
}

export function FormField({
  id,
  label,
  error,
  type = "text",
  value,
  onChange,
  className,
  required
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          className,
          error ? 'border-2 border-red-500 focus:ring-red-500' : ''
        )}
        required={required}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
} 