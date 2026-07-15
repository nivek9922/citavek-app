-- Elimina memberships duplicadas antes de aplicar la constraint única
-- (organizationId, userId). requireMembership usa findFirst sin orderBy,
-- así que hoy el rol que gana la autorización es no determinista con dupes.
-- Prioridad de conservación: 'owner' siempre gana sobre cualquier otro rol;
-- a igualdad de rol, se conserva la fila más reciente por createdAt.
DO $$
DECLARE
  deleted_count integer;
BEGIN
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY "organizationId", "userId"
      ORDER BY CASE WHEN role = 'owner' THEN 0 ELSE 1 END, "createdAt" DESC, id DESC
    ) AS rn
    FROM "member"
  )
  DELETE FROM "member" WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'member dedupe: % duplicate row(s) deleted', deleted_count;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");
