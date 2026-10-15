import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import { loteImportadoDesde } from '../entities/importacion/lotes'
import type { RepositorioDeImportacion } from '../entities/repositorios-de-importacion'

// La importación de leads por RPC (`…20261016000400_leads_csv.sql`). Un lote es todo o nada sólo en lo
// formal (la forma del pedido); cada fila vale por sí misma y la base contesta una por una.
const NO_SE_LEYO = 'No pudimos leer la respuesta. Reintenta: lo que ya entró no se duplica.'

const esquemaDeTerminar = z.object({ creadas: z.number().int() })

export const importacionSupabase: RepositorioDeImportacion = {
  importarLote: async ({ importacionId, total, filas }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('leads_importar_lote', {
      p_importacion: importacionId,
      p_total: total,
      p_filas: filas.map((fila) => ({ id: fila.id, fila: fila.fila, lead: fila.lead })) as Json,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const resultados = loteImportadoDesde(data)
    return resultados ? ok(resultados) : fallo('inesperado', NO_SE_LEYO)
  },
  terminar: async ({ importacionId, yaExistian, rechazadas, origenId }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('leads_importacion_terminar', {
      p_importacion: importacionId,
      p_ya_existian: yaExistian,
      p_rechazadas: rechazadas,
      ...(origenId ? { p_origen: origenId } : {}),
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const leido = esquemaDeTerminar.safeParse(data)
    return leido.success ? ok({ creadas: leido.data.creadas }) : fallo('inesperado', NO_SE_LEYO)
  },
}
