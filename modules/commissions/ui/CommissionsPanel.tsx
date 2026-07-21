'use client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import { useVocabulary } from '@/shared/ui/vocabulary-provider'
import { DailyClosing } from './DailyClosing'
import { SettlementsManager } from './SettlementsManager'
import { CommissionConfig } from './CommissionConfig'
import type { DailyClosing as DailyClosingData } from '../application/get-daily-closing'
import type { BarberCommissionRecord, SettlementRecord } from '../domain/ports/commissions-repository'

/** Panel del owner: cierre de caja, liquidaciones y configuración de comisiones. */
export function CommissionsPanel({
  tenantSlug,
  closing,
  closingDate,
  configs,
  settlements,
}: {
  tenantSlug: string
  closing: DailyClosingData
  closingDate: string
  configs: BarberCommissionRecord[]
  settlements: SettlementRecord[]
}) {
  const v = useVocabulary()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-wide">Comisiones</h2>
        <p className="text-sm text-muted-foreground">
          Cierre de caja diario, liquidaciones y comisión por {v.professionalSingularLower}.
        </p>
      </div>

      <Tabs defaultValue="cierre">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="cierre">Cierre de caja</TabsTrigger>
          <TabsTrigger value="liquidaciones">Liquidaciones</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="cierre" className="mt-4">
          <DailyClosing tenantSlug={tenantSlug} closing={closing} dateStr={closingDate} />
        </TabsContent>
        <TabsContent value="liquidaciones" className="mt-4">
          <SettlementsManager tenantSlug={tenantSlug} barbers={configs} settlements={settlements} />
        </TabsContent>
        <TabsContent value="config" className="mt-4">
          <CommissionConfig tenantSlug={tenantSlug} configs={configs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
