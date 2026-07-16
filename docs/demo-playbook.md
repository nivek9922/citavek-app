# Playbook de Demo — Citavek / San Fernando Barber Club

Guía rápida para presentar Citavek a un prospecto usando la organización de
demo **`san-fernando-cali`**, sembrada con `scripts/seed-demo-data.ts`.

> Los datos de referencia (teléfonos, roles, credenciales) son **deterministas**:
> el script usa una semilla fija y un orden de clientes fijo, por lo que **dev y
> producción quedan idénticos**. Este mismo playbook sirve para reproducir en dev
> cualquier bug visto en producción.

---

## 0. Cómo (re)generar los datos

```bash
# DEV (con .env apuntando a la base local):
npx tsx scripts/seed-demo-data.ts

# PRODUCCIÓN (export temporal, nunca commiteado):
DATABASE_URL='postgresql://...prod...' npx tsx scripts/seed-demo-data.ts
```

El script imprime el **host** de la base al arrancar y espera 5 s (Ctrl+C para
abortar). Es idempotente: limpia solo las filas hijas de esta org y re-siembra.

### ⚠️ Bustear la caché del storefront tras sembrar

El storefront público usa `use cache` con `cacheLife('max')`. Como el seed escribe
directo en la BD (no vía Server Action), la página pública puede seguir mostrando
datos viejos. Antes de la demo, invalida la caché de una de estas formas:

1. **Producción**: hacer un **redeploy** en Vercel (limpia el data cache), **o**
2. Entrar al panel del owner y **guardar cualquier ajuste** (branding, un servicio,
   etc.) — ese Server Action llama `updateTag(...)` y refresca el storefront, **o**
3. **Local**: detener el server → `rm -rf .next` → volver a arrancar
   (nunca borrar `.next` con el server corriendo).

---

## 1. Credenciales de login

| Rol | Email | Password | Entra a |
|---|---|---|---|
| **Dueño** | `owner@sanfernando.demo` | `Demo2024!` | `/san-fernando-cali/panel` |
| **Barbero 1** (con cuenta) | `barber1@sanfernando.demo` | `Demo2024!` | `/san-fernando-cali/panel` (agenda + ganancias propias) |
| **Barbero 2** (con cuenta) | `barber2@sanfernando.demo` | `Demo2024!` | `/san-fernando-cali/panel` (agenda + ganancias propias) |
| **Super Admin** | `nivek9922@gmail.com` | *(`SUPER_ADMIN_PASSWORD` del `.env`)* | `/admin` (Torre de Control) |

Ruta de login: **`/login`** (no existe `/sign-in`).

- **Barbero 1** = Carlos Andrés Mosquera "El Negro" (comisión **45%**, trabaja Mar–Sáb).
- **Barbero 2** = Jhon Jairo Caicedo "JJ" (comisión **40%**, trabaja Lun–Vie).
- **Steven Palacios** "Steve" — **sin cuenta** (comisión fija **$7.000/servicio**), trabaja Mié–Dom.
- **Brayan Loaiza** "Bray" — **sin cuenta** y **sin comisión configurada** (muestra el botón "Invitar" y la advertencia "⚠ Sin comisión" en el cierre de caja).

---

## 2. Clientes clave para la demo en vivo

| Escenario | Cliente | Teléfono | Qué mostrar |
|---|---|---|---|
| **Recompensa de lealtad PENDIENTE** | Andrés Rodríguez | `+573001000000` | Al iniciar una reserva con este teléfono aparece el badge **"Próxima cita gratis"** (recompensa sin canjear). Ideal para reservar en vivo. |
| **Recompensa ya CANJEADA** | Camilo Ramírez | `+573001000001` | En su historial hay una cita con **$0** (visita gratis aplicada) + registro de canje. |
| **En RIESGO de no-show** | Esteban Mejía | `+573001000006` | Tiene **3 strikes activos** → badge de riesgo visible en la agenda al asignarle una cita. |
| **Strike PERDONADO** | Tomás Henao | `+573001000007` | Tiene un strike **perdonado** por el owner (visible en el historial de no-shows). |

> El programa de fidelidad es **5 visitas → Próxima cita gratis**.
> La política de no-shows es **3 strikes en 90 días** → alerta.

---

## 3. Comisiones (para mostrar ambos tipos)

| Barbero | Tipo | Valor |
|---|---|---|
| Carlos Andrés Mosquera (El Negro) | `PERCENTAGE` | 45% |
| Jhon Jairo Caicedo (JJ) | `PERCENTAGE` | 40% |
| Steven Palacios (Steve) | `FIXED_PER_SERVICE` | $7.000 por servicio |
| Brayan Loaiza (Bray) | *sin configurar* | ⚠ muestra la advertencia |

**Liquidaciones**: las **últimas 3 semanas** ya están **liquidadas y pagadas**
("Pagado en efectivo") para los 3 barberos con comisión. La **semana actual se
deja SIN liquidar** — perfecto para mostrar en vivo el flujo *"Calcular liquidación"*.

---

## 4. Hueco libre para reservar en vivo

La próxima semana está **parcialmente reservada (~50%)**, con huecos visibles.
El seed **imprime un hueco libre concreto** al terminar, por ejemplo:

```
Hueco libre próxima semana: 2026-07-16 18:00 — Carlos Andrés Mosquera (El Negro)
```

> Ese valor es relativo a la fecha en que se corre el seed. **Lee la línea
> "Hueco libre próxima semana" de la salida del script** para el slot exacto del
> día. En general, **El Negro** suele tener libre el final de la tarde (17:00–19:00).

---

## 5. Recorrido sugerido de la demo

1. **Storefront público** `citavek.com/san-fernando-cali` — marca, 4 barberos con
   rating (4.5–4.9), 8 servicios, reseñas reales. *(Bustear caché antes; ver §0.)*
2. **Reserva en vivo** con el teléfono de Andrés Rodríguez (`+573001000000`) →
   aparece el badge **"Próxima cita gratis"**.
3. **Login como dueño** → agenda de hoy con citas, KPIs poblados, y los paneles de
   **Fidelidad**, **Comisiones** y **No-shows** con datos reales. Asignar una cita a
   Esteban Mejía (`+573001000006`) muestra el **badge de riesgo**.
4. **Cierre de caja / Calcular liquidación** (semana actual) → muestra el cálculo y
   la advertencia "⚠ Sin comisión" para Brayan Loaiza.
5. **Login como barbero 1** (`barber1@sanfernando.demo`) → ve **solo su agenda** y
   **sus ganancias**.
6. **Super Admin** `/admin` → Torre de Control: este tenant aparece como saludable y
   pagando (suscripción `active`, pago del mes). Drill-down en
   `/admin/negocios/[id]` → KPIs, salud, equipo, top servicio/barbero.

---

## 6. Verificación de consistencia dev ↔ prod

Correr en ambos entornos y comparar la "forma" de los datos:

```sql
SELECT count(*) FROM appointment           WHERE "organizationId" = '<orgId>';
SELECT count(*) FROM customer              WHERE "organizationId" = '<orgId>';
SELECT count(*) FROM commission_settlement WHERE "organizationId" = '<orgId>';
```

Los teléfonos y roles de referencia (§2) son idénticos en dev y prod porque el
script es determinista. No se exige que los IDs coincidan, solo las cantidades y la
distribución.
