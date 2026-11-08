import 'server-only'
import { cache } from 'react'
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import type { ComprobantesDeLaCotizacion } from '../../entities/comprobantes/comprobante'

// Los comprobantes de una cotización para la guardada (4.26-2), con el cliente de quien mira: la RLS deja leerlos a quien ve la cotización (base, «comprobantes:
// leer»). No se lee `datos` (P4 a). Los nombres de quien emitió y de quien anuló salen de `perfiles`, que lee todo usuario activo.

const NO_SE_LEYERON = 'No se pudieron leer los comprobantes de esta cotización.'

const esquemaDelNombre = z.object({ nombre: z.string().nullable() }).nullable()

const esquemaDeLaFila = z.object({
  id: z.guid(),
  serie: z.string().min(1),
  numero: z.number().int().positive(),
  emitido_en: z.string().min(10),
  anulado_en: z.string().min(10).nullable(),
  motivo_anulacion: z.string().nullable(),
  emisor: esquemaDelNombre,
  anulador: esquemaDelNombre,
})

const esquemaDelEstado = z.object({ estado: z.enum(['activa', 'reportada', 'invalida']) })

// El estado de la cotización (por `cotizaciones_pkey`) y sus comprobantes, del más nuevo al más viejo, por `comprobantes_cotizacion_id_idx`. Una cotización tiene
// un vigente y tantos anulados como veces se anuló: se lee uno de más que el tope para decir si hay más. La usan dos huecos (el botón de la cabecera y la sección)
// en el mismo render, por eso `cache`.
export const leerComprobantesDeLaCotizacion = cache(
  async (cotizacionId: string): Promise<Resultado<ComprobantesDeLaCotizacion>> => {
    const supabase = await createClient()
    const [cotizacion, comprobantes] = await Promise.all([
      supabase.from('cotizaciones').select('estado').eq('id', cotizacionId).maybeSingle(),
      supabase
        .from('comprobantes')
        .select(
          'id, serie, numero, emitido_en, anulado_en, motivo_anulacion, emisor:perfiles!comprobantes_emitido_por_fkey(nombre), anulador:perfiles!comprobantes_anulado_por_fkey(nombre)',
        )
        .eq('cotizacion_id', cotizacionId)
        .order('emitido_en', { ascending: false })
        .order('numero', { ascending: false })
        .limit(TAMANO_DE_VER_MAS + 1),
    ])
    const error = cotizacion.error ?? comprobantes.error
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const estado = esquemaDelEstado.safeParse(cotizacion.data)
    const filas = z.array(esquemaDeLaFila).safeParse(comprobantes.data)
    if (!estado.success || !filas.success) {
      return fallo('inesperado', NO_SE_LEYERON)
    }
    const { filas: cortadas, hayMas } = cortarAlTope(filas.data, TAMANO_DE_VER_MAS)
    return ok({
      estado: estado.data.estado,
      filas: cortadas.map((fila) => ({
        id: fila.id,
        serie: fila.serie,
        numero: fila.numero,
        emitidoEn: fila.emitido_en,
        emitidoPor: fila.emisor?.nombre ?? null,
        anuladoEn: fila.anulado_en,
        anuladoPor: fila.anulador?.nombre ?? null,
        motivo: fila.motivo_anulacion,
      })),
      hayMas,
    })
  },
)
