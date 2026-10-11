import { z } from 'zod'

// Variables públicas (viajan al navegador). Las secretas se leen sólo donde se usan, en servidor:
// ver src/shared/lib/supabase/admin.ts.
const esquemaPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

export type EntornoPublico = z.infer<typeof esquemaPublico>

let cache: EntornoPublico | undefined

// Perezoso a propósito: validar al importar rompería los tests y el build de cualquier archivo
// que sólo pase cerca de un cliente de Supabase.
export function entornoPublico(): EntornoPublico {
  cache ??= esquemaPublico.parse({
    // Acceso literal: Next sólo incrusta en el bundle del navegador las NEXT_PUBLIC_* escritas así.
    NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
  })
  return cache
}
