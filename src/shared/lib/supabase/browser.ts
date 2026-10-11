import { createBrowserClient } from '@supabase/ssr'
import { entornoPublico } from '@/shared/config/entorno'
import type { Database } from '@/shared/types/database.types'

// Cliente de navegador. Sólo para realtime y auth en el cliente (archivos `*.client.ts` de infra/):
// las lecturas van por queries de servidor y las mutaciones por Server Actions.
// `createBrowserClient` ya devuelve siempre la misma instancia en el navegador.
export function createClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = entornoPublico()
  return createBrowserClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
}
