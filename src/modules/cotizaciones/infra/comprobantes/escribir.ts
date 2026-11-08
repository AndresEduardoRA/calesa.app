import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeComprobantes } from '../../entities/comprobantes/repositorio'

// Emitir y anular se escriben sólo por RPC (4.26-1): la base mira la clave, ver la cotización, la versión y el vigente, pone la serie y `datos`, y lo que rechaza
// vuelve con su mensaje ya escrito para la persona (PT409, 23514, 22023, 42501).

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

const esquemaDelEmitido = z.object({
  id: z.guid(),
  serie: z.string().min(1),
  numero: z.number().int().positive(),
  emitido_en: z.string().min(10),
})

const esquemaDelAnulado = z.object({ id: z.guid(), anulado_en: z.string().min(10) })

export const comprobantesSupabase: RepositorioDeComprobantes = {
  emitir: async (cotizacionId, cotizacionEsperada) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('comprobante_emitir', {
      p_cotizacion: cotizacionId,
      p_cotizacion_esperada: cotizacionEsperada,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const leido = esquemaDelEmitido.safeParse(data)
    return leido.success
      ? ok({
          id: leido.data.id,
          serie: leido.data.serie,
          numero: leido.data.numero,
          emitidoEn: leido.data.emitido_en,
        })
      : fallo('inesperado', NO_SE_LEYO)
  },
  anular: async (comprobanteId, motivo) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('comprobante_anular', {
      p_comprobante: comprobanteId,
      p_motivo: motivo,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const leido = esquemaDelAnulado.safeParse(data)
    return leido.success
      ? ok({ id: leido.data.id, anuladoEn: leido.data.anulado_en })
      : fallo('inesperado', NO_SE_LEYO)
  },
}
