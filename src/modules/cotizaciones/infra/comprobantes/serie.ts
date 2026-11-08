import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { SerieVigente } from '../../entities/comprobantes/serie'

// La serie vigente para Configuración › Empresa (4.26-3), con el cliente de quien mira: la leen quien emite o quien gestiona Empresa (`comprobantes_ajustes` y
// `comprobantes_contadores`, 4.26-1). Una fila de una tabla de configuración: no crece.

const NO_SE_LEYO = 'No se pudo leer la serie de comprobantes.'

const esquemaDeLaFila = z.object({
  serie: z.string().min(1),
  actualizado_en: z.string().min(10),
  contador: z.object({ ultimo: z.number().int().nonnegative() }),
})

// Sin la fila no se inventa una serie: es un error.
export async function leerSerieVigente(): Promise<Resultado<SerieVigente>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('comprobantes_ajustes')
    .select(
      'serie, actualizado_en, contador:comprobantes_contadores!comprobantes_ajustes_serie_fkey(ultimo)',
    )
    .eq('unica', true)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leido = esquemaDeLaFila.safeParse(data)
  return leido.success
    ? ok({
        serie: leido.data.serie,
        ultimo: leido.data.contador.ultimo,
        actualizadoEn: leido.data.actualizado_en,
      })
    : fallo('inesperado', NO_SE_LEYO)
}
