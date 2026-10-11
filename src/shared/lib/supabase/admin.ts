import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { entornoPublico } from '@/shared/config/entorno'
import type { Database } from '@/shared/types/database.types'

const esquemaSecreto = z.string().min(1)

// Cliente con la secret key: SALTA la RLS. Sólo para lo que la API de admin exige (crear o
// invitar cuentas) y siempre después de comprobar el permiso con el cliente del usuario.
// Nunca se guarda en una variable global ni se pasa a un Client Component.
export function createAdminClient() {
  const secreta = esquemaSecreto.parse(process.env['SUPABASE_SECRET_KEY'])
  return createClient<Database>(entornoPublico().NEXT_PUBLIC_SUPABASE_URL, secreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
