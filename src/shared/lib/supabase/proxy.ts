import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { entornoPublico } from '@/shared/config/entorno'
import type { Database } from '@/shared/types/database.types'

// Refresca la sesión antes de renderizar y deja las cookies nuevas en la respuesta. Lo llama
// src/proxy.ts en cada request. Decidir a dónde redirigir es de quien lo llama, no de acá.
export async function actualizarSesion(
  request: NextRequest,
): Promise<{ respuesta: NextResponse; usuarioId: string | null }> {
  let respuesta = NextResponse.next({ request })
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = entornoPublico()

  const supabase = createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(nuevas, cabeceras) {
          for (const { name, value } of nuevas) {
            request.cookies.set(name, value)
          }
          respuesta = NextResponse.next({ request })
          for (const { name, value, options } of nuevas) {
            respuesta.cookies.set(name, value, options)
          }
          for (const [clave, valor] of Object.entries(cabeceras)) {
            respuesta.headers.set(clave, valor)
          }
        },
      },
    },
  )

  // getClaims() verifica la firma del JWT; getSession() confiaría en la cookie sin verificarla.
  const { data } = await supabase.auth.getClaims()
  return { respuesta, usuarioId: data?.claims.sub ?? null }
}
