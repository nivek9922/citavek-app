/**
 * Seed de datos de DEMO para vender Citavek — organización `san-fernando-cali`.
 *
 * Llena una barbería con ~1 mes de historia + hoy + próxima semana, mostrando
 * todos los módulos: catálogo, equipo (con y sin cuenta), comisiones, fidelidad,
 * no-shows, reviews, liquidaciones y una suscripción saludable.
 *
 * - Idempotente: limpia SOLO las filas hijas de esta org y re-siembra (no duplica).
 * - Nunca `db.organization.delete` — la org y su config se conservan/actualizan.
 * - Todas las fechas son relativas a `new Date()` (ventana coherente cualquier día).
 * - Reutiliza las funciones PURAS de producción (comisión, lealtad) — cálculo idéntico.
 * - Los inserts son directos (las use cases reales rechazan fechas pasadas); el script
 *   es responsable de no solapar citas por barbero (cursor secuencial por barbero-día).
 *
 * Uso:  npx tsx scripts/seed-demo-data.ts
 *   dev  → con .env.local apuntando a la base local
 *   prod → export temporal de DATABASE_URL de producción (nunca commiteada)
 */

import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import type { AppointmentStatus, AppointmentSource, ServiceCategory } from '../generated/prisma/client'
import { auth } from '../server/auth.config'
import { computeCommission, type CommissionConfig } from '../modules/commissions/domain/commission'
import {
  applyCompletedVisit,
  computeRewardDiscount,
  type LoyaltyProgramConfig,
  type LoyaltyCardState,
} from '../modules/loyalty/domain/loyalty'
import { currentWeekBoundsUTC } from '../modules/analytics/domain/date-utils'
import { format, addDays, parseISO } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

const SLUG = 'san-fernando-cali'
const TZ = 'America/Bogota'
const OWNER = { email: 'owner@sanfernando.demo', password: 'Demo2024!', name: 'Carlos Mosquera (Dueño)' }

// ───────────────────────── PRNG determinista ─────────────────────────
// Semilla fija → dev y prod obtienen la misma "forma" de datos.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20260715)
const rand = () => rng()
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

// ───────────────────────── Fechas / zona horaria ─────────────────────────
const todayStr = format(toZonedTime(new Date(), TZ), 'yyyy-MM-dd')
const nowLocalMinutes = (() => {
  const hhmm = format(toZonedTime(new Date(), TZ), 'HH:mm')
  const [h, m] = hhmm.split(':').map(Number)
  return h! * 60 + m!
})()

/** Fecha calendario e info de día para un offset (en días) desde hoy, en TZ del tenant. */
function dateInfo(offset: number): { dateStr: string; dow: number } {
  const d = addDays(parseISO(todayStr), offset)
  return { dateStr: format(d, 'yyyy-MM-dd'), dow: d.getDay() } // dow: 0=dom … 6=sáb
}
/** Instante UTC para una hora local (minutos desde medianoche) de un día del tenant. */
function utcAt(dateStr: string, minutesFromMidnight: number): Date {
  const hh = String(Math.floor(minutesFromMidnight / 60)).padStart(2, '0')
  const mm = String(minutesFromMidnight % 60).padStart(2, '0')
  return fromZonedTime(`${dateStr}T${hh}:${mm}:00`, TZ)
}

// ───────────────────────── Catálogo ─────────────────────────
type Svc = { key: string; name: string; description: string; durationMin: number; priceCop: number; category: ServiceCategory }
const SERVICES: Svc[] = [
  { key: 'corte', name: 'Corte Clásico', description: 'Corte tradicional con tijera y máquina, incluye lavado.', durationMin: 30, priceCop: 25000, category: 'corte' },
  { key: 'combo', name: 'Corte + Barba', description: 'Combo más pedido. Corte completo y arreglo de barba con toalla caliente.', durationMin: 60, priceCop: 45000, category: 'combo' },
  { key: 'barba', name: 'Diseño de Barba', description: 'Perfilado, recorte y aceite hidratante.', durationMin: 30, priceCop: 22000, category: 'barba' },
  { key: 'nino', name: 'Corte Niño', description: 'Para los más pequeños, paciencia incluida.', durationMin: 30, priceCop: 20000, category: 'infantil' },
  { key: 'masc', name: 'Mascarilla Negra', description: 'Limpieza profunda de puntos negros.', durationMin: 20, priceCop: 18000, category: 'tratamiento' },
  { key: 'cejas', name: 'Cejas', description: 'Perfilado de cejas con cera o navaja.', durationMin: 15, priceCop: 8000, category: 'tratamiento' },
  { key: 'afeit', name: 'Afeitado Clásico con Toalla Caliente', description: 'Afeitado a navaja con toalla caliente y bálsamo.', durationMin: 25, priceCop: 25000, category: 'barba' },
  { key: 'cejnav', name: 'Diseño de Cejas con Navaja', description: 'Perfilado de cejas con navaja para máxima precisión.', durationMin: 15, priceCop: 10000, category: 'tratamiento' },
]
const PRIMARY_KEYS = ['corte', 'corte', 'corte', 'combo', 'combo', 'barba', 'barba', 'afeit', 'nino'] as const
const ADDON_KEYS = ['cejas', 'masc', 'cejnav'] as const

// ───────────────────────── Equipo ─────────────────────────
type BarberDef = {
  key: string
  displayName: string
  nickname: string | null
  specialties: string[]
  days: number[] // dayOfWeek 0-6
  account: { email: string; password: string; name: string } | null
  commission: CommissionConfig | null
}
const BARBERS: BarberDef[] = [
  { key: 'b1', displayName: 'Carlos Andrés Mosquera', nickname: 'El Negro', specialties: ['Fades', 'Diseños', 'Barba'], days: [2, 3, 4, 5, 6], account: { email: 'barber1@sanfernando.demo', password: 'Demo2024!', name: 'Carlos Andrés Mosquera' }, commission: { commissionType: 'PERCENTAGE', percentage: 45, fixedAmount: null } },
  { key: 'b2', displayName: 'Jhon Jairo Caicedo', nickname: 'JJ', specialties: ['Barba', 'Clásico'], days: [1, 2, 3, 4, 5], account: { email: 'barber2@sanfernando.demo', password: 'Demo2024!', name: 'Jhon Jairo Caicedo' }, commission: { commissionType: 'PERCENTAGE', percentage: 40, fixedAmount: null } },
  { key: 'b3', displayName: 'Steven Palacios', nickname: 'Steve', specialties: ['Niños', 'Texturizado'], days: [3, 4, 5, 6, 0], account: null, commission: { commissionType: 'FIXED_PER_SERVICE', percentage: null, fixedAmount: 7000 } },
  { key: 'b4', displayName: 'Brayan Loaiza', nickname: 'Bray', specialties: ['Fades', 'Cejas'], days: [1, 2, 3, 4, 5, 6], account: null, commission: null },
]

// ───────────────────────── Clientes ─────────────────────────
type Role = 'freq' | 'problem' | 'regular' | 'new'
type CustomerDef = {
  name: string
  phone: string
  role: Role
  cap: number // nº de citas históricas objetivo
  noShowQuota: number // cuántas de sus históricas se marcan no_show
  forgiveOne: boolean // perdonar 1 de sus strikes
  tag?: 'loyaltyPending' | 'loyaltyRedeemed' | 'problemAtRisk'
}
function buildCustomers(): CustomerDef[] {
  const freqNames = ['Andrés Rodríguez', 'Camilo Ramírez', 'Juan Felipe López', 'Sebastián Vargas', 'Mateo González', 'Daniel Quintero']
  const problemNames = ['Esteban Mejía', 'Tomás Henao', 'Nicolás Ospina']
  const regularNames = ['Samuel Restrepo', 'Julián Cardona', 'David Zapata', 'Miguel Ángel Torres', 'Santiago Arango', 'Felipe Guerrero', 'Alejandro Ríos', 'Óscar Muñoz', 'Kevin Salazar', 'Cristian Bedoya', 'Jorge Iván Loaiza', 'Diego Fernando Ruiz']
  const newNames = ['Brandon Castaño', 'Yeison Marín', 'Emanuel Correa', 'Luis Carlos Peña', 'Fabián Ochoa', 'Harold Giraldo', 'Wilmar Cataño']

  const out: CustomerDef[] = []
  const phone = (idx: number) => `+57300${1000000 + idx}` // claramente ficticio (+57 300 100 00XX)

  freqNames.forEach((name, i) => {
    const tag = i === 0 ? 'loyaltyPending' : i === 1 ? 'loyaltyRedeemed' : undefined
    const cap = i === 0 ? 7 : i === 1 ? 9 : randInt(7, 10)
    out.push({ name, phone: phone(out.length), role: 'freq', cap, noShowQuota: 0, forgiveOne: false, tag })
  })
  // problemas: A → 3 strikes activos (badge); B → 2 strikes con 1 perdonado; C → 2 strikes
  const problemSpecs = [
    { cap: 6, noShowQuota: 3, forgiveOne: false, tag: 'problemAtRisk' as const },
    { cap: 6, noShowQuota: 2, forgiveOne: true, tag: undefined },
    { cap: 5, noShowQuota: 2, forgiveOne: false, tag: undefined },
  ]
  problemNames.forEach((name, i) => {
    const s = problemSpecs[i]!
    out.push({ name, phone: phone(out.length), role: 'problem', cap: s.cap, noShowQuota: s.noShowQuota, forgiveOne: s.forgiveOne, tag: s.tag })
  })
  regularNames.forEach((name) => out.push({ name, phone: phone(out.length), role: 'regular', cap: randInt(2, 4), noShowQuota: 0, forgiveOne: false }))
  newNames.forEach((name) => out.push({ name, phone: phone(out.length), role: 'new', cap: 1, noShowQuota: 0, forgiveOne: false }))
  return out
}

// ───────────────────────── Borrador de cita (en memoria) ─────────────────────────
type Line = { serviceKey: string; priceCop: number; durationMin: number }
type ApptDraft = {
  barberIdx: number
  custIdx: number
  offset: number
  startAt: Date
  endAt: Date
  durationMin: number
  priceCop: number
  lines: Line[]
  status: AppointmentStatus
  source: AppointmentSource
  cancelledAt: Date | null
  isFreeRedemption: boolean
  dbId?: string
}

const svcByKey = new Map(SERVICES.map((s) => [s.key, s]))
function pickServices(): { lines: Line[]; durationMin: number; priceCop: number } {
  const primary = svcByKey.get(pick(PRIMARY_KEYS))!
  const lines: Line[] = [{ serviceKey: primary.key, priceCop: primary.priceCop, durationMin: primary.durationMin }]
  if (primary.category !== 'combo' && rand() < 0.28) {
    const addon = svcByKey.get(pick(ADDON_KEYS))!
    if (addon.key !== primary.key) lines.push({ serviceKey: addon.key, priceCop: addon.priceCop, durationMin: addon.durationMin })
  }
  const durationMin = lines.reduce((a, l) => a + l.durationMin, 0)
  const priceCop = lines.reduce((a, l) => a + l.priceCop, 0)
  return { lines, durationMin, priceCop }
}

// Estado de cursor por (barbero, día) — garantiza no-solape secuencial.
const cursor = new Map<string, number>()
const WORK_START = 540 // 09:00
const WORK_END = 1200 // 20:00
function tryPlace(barberIdx: number, dateStr: string, durationMin: number): number | null {
  const key = `${barberIdx}|${dateStr}`
  let cur = cursor.get(key)
  if (cur === undefined) cur = WORK_START + randInt(0, 3) * 15 // pequeño jitter al abrir
  if (cur + durationMin > WORK_END) return null
  const startMin = cur
  cursor.set(key, startMin + durationMin + randInt(0, 2) * 15) // gap 0/15/30 min
  return startMin
}
function barbersWorking(dow: number): number[] {
  return BARBERS.map((b, i) => (b.days.includes(dow) ? i : -1)).filter((i) => i >= 0)
}

async function main() {
  const dbHost = new URL(process.env.DATABASE_URL!).host
  console.log(`\n⚠️  Corriendo SEED DE DEMO contra: ${dbHost}`)
  console.log(`   Org objetivo: ${SLUG}  ·  hoy (tenant): ${todayStr}`)
  console.log(`   Presiona Ctrl+C en los próximos 5 segundos si NO es correcto...`)
  await new Promise((r) => setTimeout(r, 5000))

  // ── Paso 0: resolver org + inventario + salvaguarda + limpieza ──────────────
  let org = await db.organization.findUnique({ where: { slug: SLUG } })
  if (!org) {
    console.log('· La org no existe; creándola.')
    org = await db.organization.create({
      data: { name: 'San Fernando Barber Club', slug: SLUG, city: 'Cali, Valle', address: 'Cra 39 #5-12, San Fernando', phone: '+573187654321', timezone: TZ, currency: 'COP', status: 'active' },
    })
  } else {
    await db.organization.update({ where: { id: org.id }, data: { name: 'San Fernando Barber Club', city: 'Cali, Valle', address: 'Cra 39 #5-12, San Fernando', phone: '+573187654321', timezone: TZ } })
  }
  const orgId = org.id

  const inv = {
    appointments: await db.appointment.count({ where: { organizationId: orgId } }),
    customers: await db.customer.count({ where: { organizationId: orgId } }),
    reviews: await db.review.count({ where: { organizationId: orgId } }),
    settlements: await db.commissionSettlement.count({ where: { organizationId: orgId } }),
    strikes: await db.noShowStrike.count({ where: { organizationId: orgId } }),
  }
  console.log('· Inventario actual:', inv)

  const existingSub = await db.subscription.findUnique({ where: { organizationId: orgId } })
  if (existingSub && (existingSub.mpSubscriptionId || (existingSub.paymentMethod && existingSub.paymentMethod !== 'manual'))) {
    console.error('\n⛔ La suscripción parece REAL (pago no-manual / Mercado Pago). Abortando por seguridad.')
    console.error('   Revisa manualmente antes de correr el seed sobre esta org.')
    process.exit(1)
  }

  console.log('· Limpiando filas hijas de esta org (scoped)...')
  await db.review.deleteMany({ where: { organizationId: orgId } })
  await db.noShowStrike.deleteMany({ where: { organizationId: orgId } })
  await db.loyaltyRedemption.deleteMany({ where: { organizationId: orgId } })
  await db.commissionSettlement.deleteMany({ where: { organizationId: orgId } })
  await db.appointment.deleteMany({ where: { organizationId: orgId } }) // cascade → appointment_service
  await db.loyaltyCard.deleteMany({ where: { organizationId: orgId } })
  await db.customer.deleteMany({ where: { organizationId: orgId } })
  await db.barberInvitation.deleteMany({ where: { organizationId: orgId } })

  // ── Paso 1: Branding ────────────────────────────────────────────────────────
  await db.branding.upsert({
    where: { organizationId: orgId },
    update: { primaryColor: '#E0A300', tagline: 'El estilo del Valle, en tus manos.', storefrontTheme: 'DARK' },
    create: { organizationId: orgId, primaryColor: '#E0A300', tagline: 'El estilo del Valle, en tus manos.', storefrontTheme: 'DARK' },
  })

  // ── Paso 2: Catálogo ──────────────────────────────────────────────────────────
  const serviceId = new Map<string, string>()
  for (let i = 0; i < SERVICES.length; i++) {
    const s = SERVICES[i]!
    const existing = await db.service.findFirst({ where: { organizationId: orgId, name: s.name } })
    const rec = existing
      ? await db.service.update({ where: { id: existing.id }, data: { description: s.description, durationMin: s.durationMin, priceCop: s.priceCop, category: s.category, active: true, sortOrder: i } })
      : await db.service.create({ data: { organizationId: orgId, name: s.name, description: s.description, durationMin: s.durationMin, priceCop: s.priceCop, category: s.category, active: true, sortOrder: i } })
    serviceId.set(s.key, rec.id)
  }

  // ── Paso 3 + 4: Equipo (con/sin cuenta) + comisiones ──────────────────────────
  const barberId: string[] = []
  for (let i = 0; i < BARBERS.length; i++) {
    const b = BARBERS[i]!
    const existing = await db.barber.findFirst({ where: { organizationId: orgId, displayName: b.displayName } })
    const rec = existing
      ? await db.barber.update({ where: { id: existing.id }, data: { nickname: b.nickname, specialties: b.specialties, active: true, sortOrder: i } })
      : await db.barber.create({ data: { organizationId: orgId, displayName: b.displayName, nickname: b.nickname, specialties: b.specialties, active: true, sortOrder: i } })
    barberId.push(rec.id)

    // Horarios: recrear para reflejar los días definidos
    await db.workingHour.deleteMany({ where: { barberId: rec.id } })
    await db.workingHour.createMany({ data: b.days.map((d) => ({ barberId: rec.id, dayOfWeek: d, startMin: WORK_START, endMin: WORK_END })) })

    // Cuenta de login (2 barberos) → user + link userId + Member role 'barber'
    if (b.account) {
      const userId = await ensureUser(b.account.email, b.account.password, b.account.name)
      await db.barber.update({ where: { id: rec.id }, data: { userId } })
      await ensureMember(orgId, userId, 'barber')
    } else {
      await db.barber.update({ where: { id: rec.id }, data: { userId: null } })
    }

    // Comisión (3 de 4; B4 sin comisión)
    if (b.commission) {
      await db.barberCommission.upsert({
        where: { barberId: rec.id },
        update: { commissionType: b.commission.commissionType, percentage: b.commission.percentage, fixedAmount: b.commission.fixedAmount, organizationId: orgId },
        create: { barberId: rec.id, organizationId: orgId, commissionType: b.commission.commissionType, percentage: b.commission.percentage, fixedAmount: b.commission.fixedAmount },
      })
    } else {
      await db.barberCommission.deleteMany({ where: { barberId: rec.id } })
    }
  }

  // Owner
  const ownerUserId = await ensureUser(OWNER.email, OWNER.password, OWNER.name)
  await ensureMember(orgId, ownerUserId, 'owner')

  // ── Paso 5: Fidelidad ─────────────────────────────────────────────────────────
  const program: LoyaltyProgramConfig = { isActive: true, requiredVisits: 5, rewardType: 'FREE_NEXT_VISIT', discountPct: null, discountAmount: null, freeServiceId: null }
  await db.loyaltyProgram.upsert({
    where: { organizationId: orgId },
    update: { isActive: true, requiredVisits: 5, rewardType: 'FREE_NEXT_VISIT', discountPct: null, discountAmount: null, freeServiceId: null },
    create: { organizationId: orgId, isActive: true, requiredVisits: 5, rewardType: 'FREE_NEXT_VISIT' },
  })

  // ── Paso 6: No-shows ────────────────────────────────────────────────────────────
  await db.noShowPolicy.upsert({
    where: { organizationId: orgId },
    update: { isActive: true, strikeThreshold: 3 },
    create: { organizationId: orgId, isActive: true, strikeThreshold: 3 },
  })

  // ── Paso 7: Clientes + citas (núcleo) ─────────────────────────────────────────
  const customers = buildCustomers()
  const drafts: ApptDraft[] = []

  // Offsets históricos ponderados por día de semana (más jue–sáb, menos lun–mar/dom).
  const weekdayWeight = (dow: number) => (dow === 5 || dow === 6 ? 4 : dow === 4 ? 3 : dow === 3 ? 2 : dow === 0 ? 1 : 1)
  const histOffsets: number[] = []
  for (let off = -29; off <= -1; off++) {
    const { dow } = dateInfo(off)
    if (barbersWorking(dow).length === 0) continue
    for (let w = 0; w < weekdayWeight(dow); w++) histOffsets.push(off)
  }

  // Cola de demanda histórica: cada cliente aparece `cap` veces.
  const histQueue = shuffle(customers.flatMap((c, idx) => Array<number>(c.cap).fill(idx)))

  for (const custIdx of histQueue) {
    const svc = pickServices()
    let placed = false
    for (let attempt = 0; attempt < 60 && !placed; attempt++) {
      const off = pick(histOffsets)
      const { dateStr, dow } = dateInfo(off)
      const options = barbersWorking(dow)
      if (options.length === 0) continue
      const barberIdx = pick(options)
      const startMin = tryPlace(barberIdx, dateStr, svc.durationMin)
      if (startMin === null) continue
      const startAt = utcAt(dateStr, startMin)
      drafts.push({
        barberIdx, custIdx, offset: off, startAt,
        endAt: new Date(startAt.getTime() + svc.durationMin * 60000),
        durationMin: svc.durationMin, priceCop: svc.priceCop, lines: svc.lines,
        status: 'completed', source: rand() < 0.2 ? 'manual' : 'online', cancelledAt: null, isFreeRedemption: false,
      })
      placed = true
    }
  }

  // Estados históricos: no_show (cuota de problemáticos) + cancelled (~6% del resto)
  for (let ci = 0; ci < customers.length; ci++) {
    const c = customers[ci]!
    if (c.noShowQuota <= 0) continue
    const mine = drafts.filter((d) => d.custIdx === ci).sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    for (let k = 0; k < Math.min(c.noShowQuota, mine.length); k++) mine[k]!.status = 'no_show'
  }
  for (const d of drafts) {
    if (d.status !== 'completed') continue
    if (customers[d.custIdx]!.role === 'problem') continue
    if (rand() < 0.06) {
      d.status = 'cancelled'
      d.cancelledAt = new Date(d.startAt.getTime() - randInt(1, 20) * 3600_000)
    }
  }

  // HOY: 5–8 citas — completadas si ya pasó la hora, si no confirmadas.
  {
    const { dateStr, dow } = dateInfo(0)
    const options = barbersWorking(dow)
    let placedToday = 0
    const targetToday = randInt(5, 8)
    let guard = 0
    while (placedToday < targetToday && options.length > 0 && guard++ < 200) {
      const barberIdx = pick(options)
      const svc = pickServices()
      const startMin = tryPlace(barberIdx, dateStr, svc.durationMin)
      if (startMin === null) continue
      const startAt = utcAt(dateStr, startMin)
      const custIdx = pickCustomerForFuture(customers)
      drafts.push({
        barberIdx, custIdx, offset: 0, startAt,
        endAt: new Date(startAt.getTime() + svc.durationMin * 60000),
        durationMin: svc.durationMin, priceCop: svc.priceCop, lines: svc.lines,
        status: startMin < nowLocalMinutes ? 'completed' : 'confirmed',
        source: rand() < 0.3 ? 'manual' : 'online', cancelledAt: null, isFreeRedemption: false,
      })
      placedToday++
    }
  }

  // PRÓXIMA SEMANA: 40–60% ocupación, confirmadas, dejando huecos visibles.
  for (let off = 1; off <= 7; off++) {
    const { dateStr, dow } = dateInfo(off)
    for (const barberIdx of barbersWorking(dow)) {
      const n = pick([0, 1, 1, 2, 2, 3]) // deja huecos visibles pero con ocupación media
      for (let k = 0; k < n; k++) {
        const svc = pickServices()
        const startMin = tryPlace(barberIdx, dateStr, svc.durationMin)
        if (startMin === null) break
        const startAt = utcAt(dateStr, startMin)
        drafts.push({
          barberIdx, custIdx: pickCustomerForFuture(customers), offset: off, startAt,
          endAt: new Date(startAt.getTime() + svc.durationMin * 60000),
          durationMin: svc.durationMin, priceCop: svc.priceCop, lines: svc.lines,
          status: 'confirmed', source: rand() < 0.15 ? 'manual' : 'online', cancelledAt: null, isFreeRedemption: false,
        })
      }
    }
  }

  // ── Fidelidad: fold determinista sobre citas completadas ──────────────────────
  type Redemption = { custIdx: number; discountCop: number; draft: ApptDraft }
  const redemptions: Redemption[] = []
  const cards: { custIdx: number; state: LoyaltyCardState; lastVisitAt: Date }[] = []
  for (let ci = 0; ci < customers.length; ci++) {
    const completed = drafts
      .filter((d) => d.custIdx === ci && d.status === 'completed')
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    if (completed.length === 0) continue
    const isRedeemer = customers[ci]!.tag === 'loyaltyRedeemed'
    let card: LoyaltyCardState = { completedVisits: 0, totalVisits: 0, rewardsEarned: 0, rewardPending: false }
    let consumed = false
    for (const d of completed) {
      if (isRedeemer && card.rewardPending && !consumed) {
        const total = d.lines.reduce((a, l) => a + l.priceCop, 0)
        const discount = computeRewardDiscount(program, d.lines.map((l) => ({ serviceId: l.serviceKey, priceCop: l.priceCop })))
        d.priceCop = Math.max(0, total - discount) // FREE_NEXT_VISIT → 0
        d.isFreeRedemption = true
        redemptions.push({ custIdx: ci, discountCop: discount, draft: d })
        card = { ...card, rewardPending: false }
        consumed = true
      }
      card = applyCompletedVisit(card, program)
    }
    cards.push({ custIdx: ci, state: card, lastVisitAt: completed[completed.length - 1]!.startAt })
  }

  // ── Reviews: ~35% de las completadas; rating CONTROLADO por barbero (4.5-4.9) ──
  const COMMENTS: Record<number, string[]> = {
    5: ['Excelente corte, quedé muy satisfecho.', 'El mejor de San Fernando, sin duda.', 'Puntual y muy profesional. Vuelvo seguro.', 'Me encantó el fade, súper limpio.', 'Atención de primera, ambiente muy bueno.'],
    4: ['Muy buen corte, buena atención.', 'Quedó bien, aunque esperé unos minutos.', 'Buen servicio, recomendado.', 'Cumple, buen trabajo con la barba.'],
    3: ['Corte normal, esperaba un poco más.', 'Bien, pero se demoró más de lo esperado.'],
  }
  // Seleccionar ~35% de las completadas y repartir 4★/5★ por barbero para que el
  // promedio caiga en [4.5, 4.9]; una sola reseña de 3★ (autenticidad) en el barbero
  // con más reseñas — apenas mueve su promedio.
  const selectedReviews = drafts.filter((d) => d.status === 'completed' && rand() < 0.35)
  const fourStarFrac = [0.2, 0.15, 0.3, 0.1] // b1..b4 → avg ≈ 4.8, 4.85, 4.7, 4.9
  const reviewsByBarber = new Map<number, ApptDraft[]>()
  for (const d of selectedReviews) {
    const arr = reviewsByBarber.get(d.barberIdx) ?? []
    arr.push(d)
    reviewsByBarber.set(d.barberIdx, arr)
  }
  const reviewDrafts: { draft: ApptDraft; rating: number; comment: string }[] = []
  for (const [bi, list] of reviewsByBarber) {
    const shuffled = shuffle(list)
    const fours = Math.round(shuffled.length * (fourStarFrac[bi] ?? 0.2))
    shuffled.forEach((d, idx) => {
      const rating = idx < fours ? 4 : 5
      reviewDrafts.push({ draft: d, rating, comment: pick(COMMENTS[rating]!) })
    })
  }
  // Una reseña de 3★ en el barbero con más reseñas
  let biggestBi = -1
  let biggestN = -1
  for (const [bi, list] of reviewsByBarber) if (list.length > biggestN) { biggestN = list.length; biggestBi = bi }
  const threeStarTarget = reviewDrafts.find((r) => r.draft.barberIdx === biggestBi)
  if (threeStarTarget) { threeStarTarget.rating = 3; threeStarTarget.comment = pick(COMMENTS[3]!) }

  // ── Aserciones de narrativa (fallar temprano si algo no cuadra) ───────────────
  const assertNarrative = () => {
    const pending = cards.find((c) => customers[c.custIdx]!.tag === 'loyaltyPending')
    const redeemed = cards.find((c) => customers[c.custIdx]!.tag === 'loyaltyRedeemed')
    if (!pending?.state.rewardPending) throw new Error('Narrativa: el cliente de recompensa PENDIENTE no quedó con rewardPending=true.')
    if (!redeemed || redeemed.state.rewardsEarned < 1) throw new Error('Narrativa: el cliente de recompensa CANJEADA no alcanzó el umbral.')
    if (redemptions.length < 1) throw new Error('Narrativa: no se registró ningún canje de lealtad.')
    const atRisk = customers.find((c) => c.tag === 'problemAtRisk')!
    const strikesAtRisk = drafts.filter((d) => d.custIdx === customers.indexOf(atRisk) && d.status === 'no_show').length
    if (strikesAtRisk < 3) throw new Error(`Narrativa: el cliente en riesgo tiene ${strikesAtRisk} no_show (se esperaban 3).`)
  }
  assertNarrative()

  // ── Insertar clientes ─────────────────────────────────────────────────────────
  const customerId: string[] = []
  for (const c of customers) {
    const rec = await db.customer.upsert({
      where: { organizationId_phone: { organizationId: orgId, phone: c.phone } },
      update: { name: c.name },
      create: { organizationId: orgId, name: c.name, phone: c.phone },
    })
    customerId.push(rec.id)
  }

  // ── Insertar citas (captura dbId) ─────────────────────────────────────────────
  for (const d of drafts) {
    const c = customers[d.custIdx]!
    const rec = await db.appointment.create({
      data: {
        organizationId: orgId,
        barberId: barberId[d.barberIdx]!,
        customerId: customerId[d.custIdx]!,
        customerName: c.name,
        customerPhone: c.phone,
        startAt: d.startAt,
        endAt: d.endAt,
        durationMin: d.durationMin,
        priceCop: d.priceCop,
        status: d.status,
        source: d.source,
        cancelledAt: d.cancelledAt,
        createdByUserId: d.source === 'manual' ? ownerUserId : null,
        appointmentServices: { create: d.lines.map((l) => ({ serviceId: serviceId.get(l.serviceKey)!, priceCop: l.priceCop, durationMin: l.durationMin })) },
      },
    })
    d.dbId = rec.id
  }

  // ── Insertar LoyaltyCards ─────────────────────────────────────────────────────
  for (const c of cards) {
    const cust = customers[c.custIdx]!
    await db.loyaltyCard.upsert({
      where: { organizationId_customerPhone: { organizationId: orgId, customerPhone: cust.phone } },
      update: { customerName: cust.name, completedVisits: c.state.completedVisits, totalVisits: c.state.totalVisits, rewardsEarned: c.state.rewardsEarned, rewardPending: c.state.rewardPending, lastVisitAt: c.lastVisitAt },
      create: { organizationId: orgId, customerPhone: cust.phone, customerName: cust.name, completedVisits: c.state.completedVisits, totalVisits: c.state.totalVisits, rewardsEarned: c.state.rewardsEarned, rewardPending: c.state.rewardPending, lastVisitAt: c.lastVisitAt },
    })
  }

  // ── Insertar canjes de lealtad ────────────────────────────────────────────────
  for (const r of redemptions) {
    await db.loyaltyRedemption.create({
      data: { organizationId: orgId, customerPhone: customers[r.custIdx]!.phone, rewardType: 'FREE_NEXT_VISIT', discountCop: r.discountCop, appointmentId: r.draft.dbId, createdAt: r.draft.startAt },
    })
  }

  // ── Insertar strikes de no-show (1 perdonado donde aplique) ───────────────────
  for (let ci = 0; ci < customers.length; ci++) {
    const c = customers[ci]!
    const noShows = drafts.filter((d) => d.custIdx === ci && d.status === 'no_show').sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    for (let k = 0; k < noShows.length; k++) {
      const d = noShows[k]!
      const forgiven = c.forgiveOne && k === 0
      await db.noShowStrike.create({
        data: {
          organizationId: orgId, customerPhone: c.phone, customerName: c.name, appointmentId: d.dbId!,
          forgiven, forgivenAt: forgiven ? new Date(d.startAt.getTime() + 86_400_000) : null, forgivenNote: forgiven ? 'Cliente avisó con tiempo, se perdona.' : null,
          createdAt: d.startAt,
        },
      })
    }
  }

  // ── Insertar reviews + recomputar rating/reviewsCount por barbero ─────────────
  for (const rv of reviewDrafts) {
    await db.review.create({
      data: { organizationId: orgId, barberId: barberId[rv.draft.barberIdx]!, appointmentId: rv.draft.dbId!, rating: rv.rating, comment: rv.comment, createdAt: new Date(rv.draft.startAt.getTime() + randInt(0, 2) * 86_400_000) },
    })
  }
  for (const bid of barberId) {
    const agg = await db.review.aggregate({ where: { barberId: bid }, _avg: { rating: true }, _count: true })
    await db.barber.update({ where: { id: bid }, data: { rating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0, reviewsCount: agg._count } })
  }

  // ── Paso 9: Liquidaciones de comisiones (2-3 semanas pasadas, pagadas) ─────────
  const { weekStart } = currentWeekBoundsUTC(TZ)
  for (let w = 1; w <= 3; w++) {
    const periodStart = new Date(weekStart.getTime() - w * 7 * 86_400_000)
    const periodEnd = new Date(weekStart.getTime() - (w - 1) * 7 * 86_400_000)
    for (let bi = 0; bi < BARBERS.length; bi++) {
      const cfg = BARBERS[bi]!.commission
      if (!cfg) continue // B4 sin comisión → no se liquida
      const bid = barberId[bi]!
      const agg = await db.appointment.aggregate({ where: { organizationId: orgId, barberId: bid, status: 'completed', startAt: { gte: periodStart, lt: periodEnd } }, _sum: { priceCop: true }, _count: true })
      const appointmentCount = agg._count
      if (appointmentCount === 0) continue
      const grossRevenueCop = agg._sum.priceCop ?? 0
      const serviceCount = await db.appointmentService.count({ where: { appointment: { organizationId: orgId, barberId: bid, status: 'completed', startAt: { gte: periodStart, lt: periodEnd } } } })
      const commissionCop = computeCommission({ priceCop: grossRevenueCop, serviceCount }, cfg)
      await db.commissionSettlement.create({
        data: { organizationId: orgId, barberId: bid, periodStart, periodEnd, grossRevenueCop, commissionCop, appointmentCount, paid: true, paidAt: new Date(periodEnd.getTime() + 2 * 86_400_000), notes: 'Pagado en efectivo.' },
      })
    }
  }
  // La semana actual se deja SIN liquidar (para el flujo en vivo).

  // ── Paso 10: Suscripción saludable ────────────────────────────────────────────
  const now = new Date()
  await db.subscription.upsert({
    where: { organizationId: orgId },
    update: { plan: 'basic', status: 'active', currentPeriodStart: new Date(now.getTime() - 5 * 86_400_000), currentPeriodEnd: new Date(now.getTime() + 25 * 86_400_000), lastPaymentAt: new Date(now.getTime() - 5 * 86_400_000), lastPaymentAmount: 79_900, paymentMethod: 'manual' },
    create: { organizationId: orgId, plan: 'basic', status: 'active', currentPeriodStart: new Date(now.getTime() - 5 * 86_400_000), currentPeriodEnd: new Date(now.getTime() + 25 * 86_400_000), lastPaymentAt: new Date(now.getTime() - 5 * 86_400_000), lastPaymentAmount: 79_900, paymentMethod: 'manual' },
  })

  // ── Paso 11: Resumen + datos del playbook ─────────────────────────────────────
  await printSummary(drafts, customers, cards, redemptions)
}

// ───────────────────────── Helpers de usuarios ─────────────────────────
async function ensureUser(email: string, password: string, name: string): Promise<string> {
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return existing.id
  try {
    await auth.api.signUpEmail({ body: { email, password, name } })
  } catch {
    // puede fallar si ya existe por carrera; re-consultar
  }
  const created = await db.user.findUnique({ where: { email } })
  if (!created) throw new Error(`No se pudo crear/encontrar el usuario ${email}`)
  return created.id
}
async function ensureMember(orgId: string, userId: string, role: string) {
  const m = await db.member.findFirst({ where: { organizationId: orgId, userId } })
  if (!m) await db.member.create({ data: { id: crypto.randomUUID(), organizationId: orgId, userId, role, createdAt: new Date() } })
  else if (m.role !== role) await db.member.update({ where: { id: m.id }, data: { role } })
}

// Cliente para citas de hoy/futuro: preferir frecuentes y regulares (no "new").
function pickCustomerForFuture(customers: CustomerDef[]): number {
  const pool = customers.map((c, i) => ({ i, w: c.role === 'freq' ? 5 : c.role === 'regular' ? 3 : c.role === 'problem' ? 1 : 0 })).filter((x) => x.w > 0)
  const total = pool.reduce((a, x) => a + x.w, 0)
  let r = rand() * total
  for (const x of pool) { if ((r -= x.w) <= 0) return x.i }
  return pool[0]!.i
}

async function printSummary(
  drafts: ApptDraft[],
  customers: CustomerDef[],
  cards: { custIdx: number; state: LoyaltyCardState; lastVisitAt: Date }[],
  redemptions: { custIdx: number; discountCop: number; draft: ApptDraft }[],
) {
  const byStatus = (s: AppointmentStatus) => drafts.filter((d) => d.status === s).length
  const pendingCust = customers.find((c) => c.tag === 'loyaltyPending')!
  const redeemedCust = customers.find((c) => c.tag === 'loyaltyRedeemed')!
  const atRiskCust = customers.find((c) => c.tag === 'problemAtRisk')!

  // Hueco libre conocido en la próxima semana para B1 (con cuenta)
  let freeSlot = 'no encontrado'
  for (let off = 1; off <= 7 && freeSlot === 'no encontrado'; off++) {
    const { dateStr, dow } = dateInfo(off)
    if (!BARBERS[0]!.days.includes(dow)) continue
    const b1Drafts = drafts.filter((d) => d.barberIdx === 0 && d.offset === off).sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    for (const slot of [1080, 1020, 960, 1140]) { // 18:00, 17:00, 16:00, 19:00
      const conflict = b1Drafts.some((d) => {
        const s = (d.startAt.getTime() - utcAt(dateStr, 0).getTime()) / 60000
        return slot < s + d.durationMin && slot + 30 > s
      })
      if (!conflict) { freeSlot = `${dateStr} ${String(Math.floor(slot / 60)).padStart(2, '0')}:${String(slot % 60).padStart(2, '0')} — Carlos Andrés Mosquera (El Negro)`; break }
    }
  }

  console.log('\n✅ Seed de demo completado.')
  console.log('─── Resumen ──────────────────────────────────────────────')
  console.log(`   Citas totales: ${drafts.length}  ·  completed ${byStatus('completed')} · confirmed ${byStatus('confirmed')} · no_show ${byStatus('no_show')} · cancelled ${byStatus('cancelled')}`)
  console.log(`   Clientes: ${customers.length}  ·  LoyaltyCards: ${cards.length}  ·  Canjes: ${redemptions.length}`)
  console.log('\n─── Playbook (referencia) ────────────────────────────────')
  console.log(`   Owner:   ${OWNER.email} / ${OWNER.password}`)
  console.log(`   Barbero1 (con cuenta): ${BARBERS[0]!.account!.email} / ${BARBERS[0]!.account!.password}  (${BARBERS[0]!.displayName})`)
  console.log(`   Barbero2 (con cuenta): ${BARBERS[1]!.account!.email} / ${BARBERS[1]!.account!.password}  (${BARBERS[1]!.displayName})`)
  console.log(`   Recompensa lealtad PENDIENTE → cliente ${pendingCust.name}  tel ${pendingCust.phone}`)
  console.log(`   Recompensa lealtad CANJEADA  → cliente ${redeemedCust.name}  tel ${redeemedCust.phone}`)
  console.log(`   En RIESGO de no-show (badge) → cliente ${atRiskCust.name}  tel ${atRiskCust.phone}`)
  console.log(`   Comisiones: ${BARBERS[0]!.displayName} 45% · ${BARBERS[1]!.displayName} 40% · ${BARBERS[2]!.displayName} $7.000/servicio · ${BARBERS[3]!.displayName} SIN comisión`)
  console.log(`   Hueco libre próxima semana: ${freeSlot}`)
  console.log('──────────────────────────────────────────────────────────')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
