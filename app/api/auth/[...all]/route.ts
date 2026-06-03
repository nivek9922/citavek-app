import { auth } from '@/server/auth'
import type { NextRequest } from 'next/server'

export const GET  = (req: NextRequest) => auth.handler(req)
export const POST = (req: NextRequest) => auth.handler(req)
