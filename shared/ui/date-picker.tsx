'use client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
import { Button } from '@/shared/ui/button'
import { Calendar } from '@/shared/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

export interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  min?: Date
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  min,
  placeholder = 'Selecciona una fecha',
  disabled = false,
  className,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value
            ? format(value, "EEEE d 'de' MMMM, yyyy", { locale: es })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={min ? (d: Date) => d < min : undefined}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
