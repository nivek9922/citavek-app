# Purpose
Run a comprehensive diagnostic of the bookingflow-kr platform to identify issues in development or production.

# When to use
- When the UI is not loading.
- When Server Actions return 500 errors.
- After a database change (Prisma migration).
- If the app feels unresponsive.

# Checks
1. Database: Check if PostgreSQL is reachable via Docker.
2. Prisma: Run `npx prisma validate` to ensure the schema is sound.
3. Build Status: Verify if `.next` directory exists and matches current source.
4. Port Check: Verify if port 3000 is occupied by a functioning process.

# Execution
- If DB is unreachable, suggest: `docker-compose ps` or `lazy-docker`.
- If Prisma is out of sync, suggest: `npx prisma generate`.
- If port is in use by a zombie process, suggest: `pkill -f 'next-server'`.

# Output
Report findings in a brief summary table.