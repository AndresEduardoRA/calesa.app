import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { entornoPublico } from '@/shared/config/entorno'
import type { Database } from '@/shared/types/database.types'

const esquemaSecreto = z.string().min(1)

// Cliente con la secret key: SALTA la RLS. Quién puede crearlo está escrito en
// `.claude/rules/datos.md` y lo cuida el lint (`no-restricted-imports`): hoy, sólo
// `equipo/infra/invitaciones.ts`, para la API de admin de Auth y después de comprobar el permiso
// con el cliente de quien invita. Nunca se guarda en una variable global, nunca se pasa a un
// Client Component y nunca lee `leads`, `vehiculos` ni `cotizaciones`.
export function createAdminClient() {
  const secreta = esquemaSecreto.parse(process.env['SUPABASE_SECRET_KEY'])
  return createClient<Database>(entornoPublico().NEXT_PUBLIC_SUPABASE_URL, secreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
