'use client'
import { useState } from 'react'
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
  modal?: boolean
}

export function DatePicker({
  value,
  onChange,
  min,
  placeholder = 'Selecciona una fecha',
  disabled = false,
  className,
  modal,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  function handleSelect(date: Date | undefined) {
    onChange(date)
    if (date) setOpen(false)
  }

  return (
    <Popover modal={modal} open={open} onOpenChange={setOpen}>
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
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate min-w-0 flex-1">
            {value
              ? format(value, "EEEE d 'de' MMMM, yyyy", { locale: es })
              : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={min ? (d: Date) => d < min : undefined}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
