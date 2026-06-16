'use client'
import Image from 'next/image'
import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Pencil, ToggleLeft, ToggleRight, Loader2, Star, MessageCircle, UserCheck } from 'lucide-react'
import { Button }      from '@/shared/ui/button'
import { Input }       from '@/shared/ui/input'
import { Label }       from '@/shared/ui/label'
import { Badge }       from '@/shared/ui/badge'
import { cn }          from '@/shared/ui/utils'
import { EmptyState }  from '@/shared/ui/empty-state'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/shared/ui/dialog'
import { StarRating } from '@/modules/reviews/ui/StarRating'
import { upsertBarberAction, toggleBarberAction, uploadBarberAvatarAction } from '../actions'
import { InviteBarberButton } from './InviteBarberButton'
import type { BarberWithHours } from '../queries'
import type { ReviewDTO } from '@/modules/reviews/queries'

const DAYS = [
  { value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' }, { value: 5, label: 'Vie' }, { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

function minToTime(min: number) {
  const h = Math.floor(min / 60).toString().padStart(2, '0')
  const m = (min % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function timeToMin(time: string) {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

interface Props {
  barbers:          BarberWithHours[]
  tenantSlug:       string
  reviewsByBarber?: Record<string, ReviewDTO[]>
  isOwner?:         boolean
}

export function BarbersManager({ barbers, tenantSlug, reviewsByBarber = {}, isOwner = true }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<BarberWithHours | null>(null)

  const openCreate = () => { setEditing(null); setShowForm(true) }
  const openEdit   = (b: BarberWithHours) => { setEditing(b); setShowForm(true) }
  const close      = () => { setShowForm(false); setEditing(null) }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wide">Equipo</h2>
        {isOwner && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Añadir barbero
          </Button>
        )}
      </div>

      {isOwner && showForm && (
        <BarberForm tenantSlug={tenantSlug} barber={editing} onDone={close} />
      )}

      {barbers.length === 0 ? (
        <EmptyState
          icon="✂️"
          title="Aún no tienes barberos registrados"
          description="Tus clientes podrán elegir con quién cortarse. Añade a tu equipo con sus horarios y especialidades para que aparezcan en la página de reservas."
          action={isOwner ? <Button size="sm" onClick={openCreate}>Añadir primer barbero</Button> : undefined}
        />
      ) : (
      <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
        {barbers.map((b) => (
          <BarberRow
            key={b.id}
            barber={b}
            tenantSlug={tenantSlug}
            onEdit={() => openEdit(b)}
            reviews={reviewsByBarber[b.id] ?? []}
            isOwner={isOwner}
          />
        ))}
      </div>
      )}
    </div>
  )
}

function BarberRow({
  barber, tenantSlug, onEdit, reviews, isOwner = true,
}: { barber: BarberWithHours; tenantSlug: string; onEdit: () => void; reviews: ReviewDTO[]; isOwner?: boolean }) {
  const hasAccount = barber.userId != null
  const [isPending, setIsPending] = useState(false)

  async function toggle() {
    setIsPending(true)
    try {
      await toggleBarberAction(tenantSlug, barber.id, !barber.active)
    } finally {
      setIsPending(false)
    }
  }

  const workDays = barber.workingHours
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((wh) => DAYS.find((d) => d.value === wh.dayOfWeek)?.label)
    .join(', ')

  return (
    <div className={cn('flex flex-col gap-2 bg-card px-4 py-3 transition-smooth sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-3.5', !barber.active && 'opacity-50')}>
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
        {barber.avatarUrl ? (
          <Image
            src={barber.avatarUrl}
            alt={barber.displayName}
            width={40} height={40}
            unoptimized
            priority
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
            {barber.displayName.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-medium wrap-break-word">
              {barber.displayName.split(' ').slice(0, 2).join(' ')}
              {barber.nickname && <span className="text-muted-foreground"> &ldquo;{barber.nickname}&rdquo;</span>}
            </p>
            {!barber.active && <Badge variant="outline" className="text-[10px]">Inactivo</Badge>}
            {hasAccount && (
              <span title="Cuenta vinculada" className="text-green-400">
                <UserCheck className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-primary text-primary" />
              {barber.rating.toFixed(1)}
            </span>
            {barber.specialties.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {barber.specialties.slice(0, 3).join(' · ')}
              </span>
            )}
            {workDays && (
              <span className="text-xs text-muted-foreground">{workDays}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 border-t border-border pt-2 sm:border-0 sm:pt-0">
        {reviews.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <button title="Ver reseñas"
                className="rounded-lg p-2.5 text-yellow-400 hover:bg-yellow-500/10 transition-smooth sm:p-1.5">
                <MessageCircle className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Reseñas de {barber.nickname ?? barber.displayName.split(' ')[0]}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {reviews.map((r, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <StarRating value={r.rating} readonly size="sm" />
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(r.createdAt), "d MMM yyyy", { locale: es })}
                      </span>
                    </div>
                    <p className="text-xs font-medium">{r.customerName} · {r.serviceName}</p>
                    {r.comment && (
                      <p className="text-xs text-muted-foreground italic">&ldquo;{r.comment}&rdquo;</p>
                    )}
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
        {isOwner && !hasAccount && (
          <InviteBarberButton
            tenantSlug={tenantSlug}
            barberId={barber.id}
            barberName={barber.displayName}
          />
        )}
        {isOwner && (
          <button onClick={onEdit} title="Editar"
            className="rounded-lg p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth sm:p-1.5">
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {isOwner && (
          <button onClick={toggle} disabled={isPending}
            className="rounded-lg p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth sm:p-1.5">
            {isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : barber.active
                ? <ToggleRight className="h-5 w-5 text-primary" />
                : <ToggleLeft  className="h-5 w-5" />}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Estado de horario por día ────────────────────────────────────────────────

interface DayHour { active: boolean; start: string; end: string }
type HoursState = Record<number, DayHour>

function buildInitialHours(wh: BarberWithHours['workingHours']): HoursState {
  const map: Record<number, { startMin: number; endMin: number }> = {}
  for (const h of wh) map[h.dayOfWeek] = h

  return Object.fromEntries(
    DAYS.map(({ value }) => [
      value,
      {
        active: value in map,
        start:  minToTime(map[value]?.startMin ?? 540),   // default 09:00
        end:    minToTime(map[value]?.endMin   ?? 1200),  // default 20:00
      },
    ]),
  ) as HoursState
}

// ── Formulario ───────────────────────────────────────────────────────────────

function BarberForm({
  tenantSlug, barber, onDone,
}: { tenantSlug: string; barber: BarberWithHours | null; onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]            = useState('')
  const [hours, setHours]            = useState<HoursState>(() =>
    buildInitialHours(barber?.workingHours ?? []),
  )

  function toggleDay(day: number) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day]!, active: !prev[day]!.active },
    }))
  }

  function setDayTime(day: number, field: 'start' | 'end', value: string) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day]!, [field]: value } }))
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const hoursJson = JSON.stringify(
      DAYS
        .filter(({ value }) => hours[value]?.active)
        .map(({ value }) => ({
          dayOfWeek: value,
          startMin:  timeToMin(hours[value]!.start),
          endMin:    timeToMin(hours[value]!.end),
        })),
    )

    const fd = new FormData(e.currentTarget)
    fd.set('hoursJson', hoursJson)

    startTransition(async () => {
      const result = await upsertBarberAction(tenantSlug, barber?.id ?? null, fd)
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success(barber ? 'Barbero actualizado correctamente.' : 'Barbero creado correctamente.')
      onDone()
    })
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <h3 className="mb-4 font-semibold">{barber ? 'Editar barbero' : 'Nuevo barbero'}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Datos básicos */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Nombre completo</Label>
            <Input id="displayName" name="displayName" required
              defaultValue={barber?.displayName} placeholder="Carlos Andrés Pérez" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nickname">Apodo (opcional)</Label>
            <Input id="nickname" name="nickname"
              defaultValue={barber?.nickname ?? ''} placeholder="El Negro" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="specialties">Especialidades (separadas por coma)</Label>
            <Input id="specialties" name="specialties"
              defaultValue={barber?.specialties.join(', ')} placeholder="Fades, Diseños, Barba" />
          </div>
        </div>

        {/* Avatar — solo en edición */}
        {barber && (
          <AvatarUploader
            tenantSlug={tenantSlug}
            barberId={barber.id}
            currentUrl={barber.avatarUrl ?? null}
          />
        )}

        {/* Horario por día */}
        <div className="space-y-2">
          <Label>Horario de trabajo</Label>
          <div className="overflow-hidden rounded-xl border border-border">
            {DAYS.map(({ value, label }, idx) => {
              const day = hours[value]!
              return (
                <div
                  key={value}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm transition-smooth',
                    idx < DAYS.length - 1 && 'border-b border-border',
                    !day.active && 'opacity-40',
                  )}
                >
                  <label className="flex w-10 shrink-0 cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={day.active}
                      onChange={() => toggleDay(value)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    <span className="font-medium">{label}</span>
                  </label>

                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="time"
                      value={day.start}
                      disabled={!day.active}
                      onChange={(e) => setDayTime(value, 'start', e.target.value)}
                      className="w-full min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-base disabled:cursor-not-allowed sm:w-24 sm:flex-none sm:text-xs"
                    />
                    <span className="text-muted-foreground">—</span>
                    <input
                      type="time"
                      value={day.end}
                      disabled={!day.active}
                      onChange={(e) => setDayTime(value, 'end', e.target.value)}
                      className="w-full min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-base disabled:cursor-not-allowed sm:w-24 sm:flex-none sm:text-xs"
                    />
                  </div>

                  {!day.active && (
                    <span className="text-xs text-muted-foreground">No trabaja</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending} size="sm">
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : 'Guardar'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}

// ── Avatar uploader ──────────────────────────────────────────────────────────

function AvatarUploader({
  tenantSlug, barberId, currentUrl,
}: { tenantSlug: string; barberId: string; currentUrl: string | null }) {
  const [preview,   setPreview] = useState<string | null>(currentUrl)
  const [hasFile,   setHasFile] = useState(false)
  const [isPending, start]      = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) { setHasFile(false); return }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('El archivo supera los 4 MB.')
      setHasFile(false)
      e.target.value = ''
      return
    }
    setPreview(URL.createObjectURL(file))
    setHasFile(true)
  }

  function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.set('file', file)
    start(async () => {
      try {
        const res = await uploadBarberAvatarAction(tenantSlug, barberId, fd)
        if (res.ok) {
          toast.success('Avatar actualizado correctamente.')
          setPreview(res.url)
          setHasFile(false)
          if (fileRef.current) fileRef.current.value = ''
        } else {
          toast.error(res.error)
        }
      } catch {
        toast.error('Error de red. Intenta de nuevo.')
      }
    })
  }

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">Foto del barbero</p>
      <div className="flex items-center gap-3">
        {preview ? (
            <Image
            src={preview}
            alt="Avatar"
            width={56}
            height={56}
            unoptimized
            className="h-14 w-14 shrink-0 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary border border-border">
            ?
          </div>
        )}
        <div className="flex-1 space-y-1.5">
          <Input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="cursor-pointer text-xs"
          />
          <Button type="button" size="sm" disabled={isPending || !hasFile} onClick={handleUpload}>
            {isPending ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Subiendo…</>
            ) : (
              'Subir foto'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
