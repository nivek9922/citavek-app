'use client'
import { useState } from 'react'
import { Input } from '@/shared/ui/input'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/shared/ui/select'
import { COUNTRIES, splitE164, type Country } from '@/shared/ui/phone-countries'

export interface PhoneInputProps {
  /** Valor combinado en formato E.164, ej. "+573001234567". */
  value:    string
  /** Emite el E.164 combinado (código + número local). */
  onChange: (e164: string) => void
  id?:       string
  disabled?: boolean
  placeholder?: string
}

/**
 * Campo de teléfono con selector de código de país + número local.
 * Combina ambos en E.164 antes de emitir. Reutilizable en cualquier formulario
 * (booking público y cita manual). Default: Colombia (+57).
 *
 * El país seleccionado se guarda en estado local porque no es 100% recuperable
 * del valor (varios países comparten dial, p. ej. +1). El número local se deriva
 * del `value` quitando el prefijo del dial seleccionado.
 */
export function PhoneInput({ value, onChange, id, disabled, placeholder = '300 123 4567' }: PhoneInputProps) {
  const [country, setCountry] = useState<Country>(() => splitE164(value).country)

  const digits = value.replace(/\D/g, '')
  const local  = digits.startsWith(country.dial) ? digits.slice(country.dial.length) : digits

  function selectCountry(code: string) {
    const next = COUNTRIES.find((c) => c.code === code) ?? country
    setCountry(next)
    onChange(`+${next.dial}${local}`)
  }

  function changeLocal(raw: string) {
    const nextLocal = raw.replace(/\D/g, '').slice(0, 14)
    onChange(`+${country.dial}${nextLocal}`)
  }

  return (
    <div className="flex gap-2">
      <Select value={country.code} onValueChange={selectCountry} disabled={disabled}>
        <SelectTrigger className="w-28 shrink-0" aria-label="Código de país">
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span>{country.flag}</span>
              <span>+{country.dial}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="flex items-center gap-2">
                <span>{c.flag}</span>
                <span className="text-muted-foreground">+{c.dial}</span>
                <span>{c.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder={placeholder}
        value={local}
        disabled={disabled}
        onChange={(e) => changeLocal(e.target.value)}
      />
    </div>
  )
}
