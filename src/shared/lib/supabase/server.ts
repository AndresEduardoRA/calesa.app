import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { entornoPublico } from '@/shared/config/entorno'
import type { Database } from '@/shared/types/database.types'

// Cliente de servidor: uno por request, nunca global. Corre con la sesión (y la RLS) del usuario.
export async function createClient() {
  const almacen = await cookies()
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = entornoPublico()

  return createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return almacen.getAll()
        },
        setAll(nuevas) {
          try {
            for (const { name, value, options } of nuevas) {
              almacen.set(name, value, options)
            }
          } catch {
            // Un Server Component no puede escribir cookies. No se pierde nada: src/proxy.ts ya
            // refrescó la sesión de este request antes de renderizar.
          }
        },
      },
    },
  )
}

export type ClienteSupabase = Awaited<ReturnType<typeof createClient>>
