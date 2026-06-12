/**
 * Limpieza única de datos de demo.
 * Conserva: super admin + la org "san-fernando-cali" como entorno de prueba.
 * Elimina: las 2 orgs demo restantes y sus usuarios asociados.
 *
 * Uso: npx tsx scripts/cleanup-demo-data.ts
 */

import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

const ORGS_TO_DELETE  = ['envigado-cuts', 'chapinero-shave']
const USERS_TO_DELETE = ['owner@envigado.demo', 'owner@chapinero.demo']

async function main() {
  console.log('🧹 Limpiando datos de demo...\n')

  // Eliminar orgs (cascade borra: branding, services, barbers, workingHours,
  // scheduleExceptions, appointments, customers, members, invitations, reviews)
  for (const slug of ORGS_TO_DELETE) {
    const org = await db.organization.findUnique({ where: { slug } })
    if (org) {
      await db.organization.delete({ where: { slug } })
      console.log(`   ✓ Org eliminada: ${slug}`)
    } else {
      console.log(`   · No existe: ${slug}`)
    }
  }

  // Eliminar usuarios demo (better-auth: cascade borra sessions y accounts)
  for (const email of USERS_TO_DELETE) {
    const user = await db.user.findUnique({ where: { email } })
    if (user) {
      await db.user.delete({ where: { email } })
      console.log(`   ✓ Usuario eliminado: ${email}`)
    } else {
      console.log(`   · No existe: ${email}`)
    }
  }

  console.log('\n✅ Limpieza completada.')
  console.log('   Conservados: nivek9922@gmail.com (super admin) + san-fernando-cali (demo)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
