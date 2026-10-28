import type { z } from 'zod'

import { esquemaPublico, mensajeDeProblemas, problemasDe } from './esquemas'

// Variables públicas (viajan al navegador). Las del servidor: `servidor.ts`.
export type EntornoPublico = z.infer<typeof esquemaPublico>

let cache: EntornoPublico | undefined

// Lo público tal como lo ve Next. Acceso literal: Next sólo incrusta en el bundle del navegador las NEXT_PUBLIC_* escritas así.
export function leerEntornoPublico(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'],
  }
}

// Perezoso a propósito: validar al importar rompería los tests de cualquier archivo que sólo pase cerca de un cliente de Supabase.
// El build y el arranque ya lo validan antes (next.config.ts e instrumentation.ts).
export function entornoPublico(): EntornoPublico {
  if (!cache) {
    const crudo = leerEntornoPublico()
    const problemas = problemasDe(esquemaPublico, crudo)
    if (problemas.length > 0) throw new Error(mensajeDeProblemas('la app (públicas)', problemas))
    cache = esquemaPublico.parse(crudo)
  }
  return cache
}
