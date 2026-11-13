import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { ClienteSupabase } from '@/shared/lib/supabase/server'

// Despertar la función edge `importar-csv` para una importación total (9.06-3). El pase lo pide la sesión de quien creó la importación
// (`importacion_pase_emitir`: sólo la propia y viva); a la función no viaja ninguna clave, sólo el pase de un uso.

// Por encima de los 45 s que trabaja una invocación; un corte no es grave: el job `importaciones-continuar` la retoma.
const ESPERA_MS = 55_000

export type AvanceDeImportacion = {
  estado: string
  procesadas: number | null
  filas_total: number | null
}

const respuestaDeLaFuncion = z.object({
  ok: z.literal(true),
  data: z.object({
    importacion: z.guid(),
    estado: z.string(),
    procesadas: z.number().int().nullable(),
    filas_total: z.number().int().nullable(),
  }),
})

export async function pedirPaseDeImportacion(
  supabase: ClienteSupabase,
  importacionId: string,
): Promise<Resultado<string>> {
  const { data, error } = await supabase.rpc('importacion_pase_emitir', {
    p_importacion: importacionId,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data)
}

export async function llamarImportarCsv(
  urlBase: string,
  pase: string,
): Promise<Resultado<AvanceDeImportacion>> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${urlBase}/functions/v1/importar-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pase }),
      signal: AbortSignal.timeout(ESPERA_MS),
    })
  } catch {
    return fallo('inesperado', 'La importación sigue en segundo plano.')
  }
  const cuerpo: unknown = await respuesta.json().catch(() => null)
  const leido = respuestaDeLaFuncion.safeParse(cuerpo)
  if (!respuesta.ok || !leido.success) {
    return fallo('inesperado', 'La importación sigue en segundo plano.')
  }
  const { estado, procesadas, filas_total } = leido.data.data
  return ok({ estado, procesadas, filas_total })
}
