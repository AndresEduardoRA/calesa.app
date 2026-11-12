import 'server-only'
import { z } from 'zod'
import { fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { montoEnTexto } from '../../entities/cotizador/cotizacion'
import { rechazoAlGuardar, rechazoDeLaCotizacion } from '../../entities/cotizador/errores'
import { NO_SE_LEYO_LA_RESPUESTA } from '../../entities/cotizador/errores-de-cotizacion'
import type { RepositorioDeCotizaciones } from '../../entities/cotizador/repositorio'

// Guardar, aceptar y anular una cotización de repuestos sólo por RPC (8.12-1: `repuestos_cotizacion_guardar`, `_aceptar`, `_anular`), con el cliente de
// quien pide: la base vuelve a exigir los permisos, la versión (PT409), el borrador y el proyecto abierto, y **calcula cada total con el snapshot**.
// Acá no hay aritmética: los montos viajan como el texto exacto que armó la hoja y vuelven como `::text`.
const esquemaGuardada = z.object({ actualizado_en: z.string(), total: montoEnTexto.nullable() })
const esquemaAceptada = z.object({ actualizado_en: z.string(), items: z.number().int() })
const esquemaAnulada = z.object({ actualizado_en: z.string() })

type Repositorio = Pick<RepositorioDeCotizaciones, 'guardar' | 'aceptar' | 'anular'>

export const escrituraDeCotizacionesSupabase: Repositorio = {
  guardar: async ({ id, lineas, notas, actualizadoEn }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('repuestos_cotizacion_guardar', {
      p_id: id,
      // Las claves que admite la base (V2): nunca `total`, `logistica_sugerida` ni `orden`.
      p_lineas: lineas.map((l) => ({
        id: l.id,
        item_id: l.itemId,
        descripcion: l.descripcion,
        bloque: l.bloque,
        cantidad: l.cantidad,
        costo: l.costo,
        logistica: l.logistica,
        caja: l.caja,
      })),
      p_notas: notas ?? '',
      p_actualizado_en_esperado: actualizadoEn,
    })
    if (error) return rechazoAlGuardar(error)
    const leida = esquemaGuardada.safeParse(data)
    return leida.success
      ? ok({ actualizadoEn: leida.data.actualizado_en, total: leida.data.total })
      : fallo('inesperado', NO_SE_LEYO_LA_RESPUESTA)
  },
  aceptar: async ({ id, actualizadoEn }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('repuestos_cotizacion_aceptar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEn,
    })
    if (error) return rechazoDeLaCotizacion(error)
    const leida = esquemaAceptada.safeParse(data)
    return leida.success
      ? ok({ actualizadoEn: leida.data.actualizado_en, items: leida.data.items })
      : fallo('inesperado', NO_SE_LEYO_LA_RESPUESTA)
  },
  anular: async ({ id, actualizadoEn }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('repuestos_cotizacion_anular', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEn,
    })
    if (error) return rechazoDeLaCotizacion(error)
    const leida = esquemaAnulada.safeParse(data)
    return leida.success
      ? ok({ actualizadoEn: leida.data.actualizado_en })
      : fallo('inesperado', NO_SE_LEYO_LA_RESPUESTA)
  },
}
