import 'server-only'

import type { z } from 'zod'

import { esquemaDelServidor, mensajeDeProblemas, problemasDe } from './esquemas'

// Variables del servidor (nunca `NEXT_PUBLIC_*`). Las valida `instrumentation.ts` al arrancar; quien las usa las lee de aquí.
export type EntornoDelServidor = z.infer<typeof esquemaDelServidor>

let cache: EntornoDelServidor | undefined

export function entornoDelServidor(): EntornoDelServidor {
  if (!cache) {
    const problemas = problemasDe(esquemaDelServidor, process.env)
    if (problemas.length > 0) throw new Error(mensajeDeProblemas('la app (servidor)', problemas))
    cache = esquemaDelServidor.parse(process.env)
  }
  return cache
}
