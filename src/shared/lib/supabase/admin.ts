import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { entornoPublico } from '@/shared/config/entorno'
import { entornoDelServidor } from '@/shared/config/servidor'
import type { Database } from '@/shared/types/database.types'

// Cliente con la secret key: SALTA la RLS. Quién puede crearlo está escrito en
// `.claude/rules/datos.md` y lo cuida el lint (`no-restricted-imports`): hoy,
// `equipo/infra/invitaciones.ts` (la API de admin de Auth) y `empresa/infra/revalidacion-prueba.ts`
// (sólo `integracion_secreto('web_publica')`), los dos después de comprobar el permiso con el
// cliente de quien pide, y `web/infra/portal/rpc.ts` (sólo `web.portal_*` y la URL firmada de
// `documentos`, tras validar la cookie del portal). Nunca se guarda en una variable global, nunca se pasa a un
// Client Component y nunca lee `leads`, `vehiculos` ni `cotizaciones`.
export function createAdminClient() {
  const { SUPABASE_SECRET_KEY: secreta } = entornoDelServidor()
  return createClient<Database>(entornoPublico().NEXT_PUBLIC_SUPABASE_URL, secreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
