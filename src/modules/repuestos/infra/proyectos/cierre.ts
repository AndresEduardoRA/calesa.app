import 'server-only'
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { createClient } from '@/shared/lib/supabase/server'
import { NO_SE_LEYO_EL_PROYECTO, rechazoDeProyecto } from '../../entities/proyectos/errores'
import type { CierreDeProyecto, PedidoDeCierre } from '../../entities/proyectos/repositorio'

// Cerrar y reabrir un proyecto es sólo por RPC (`repuesto_proyecto_cerrar` y `_reabrir`, 8.08-1): piden `repuestos.editar`, la versión que se vio (`PT409` con su mensaje si otra persona
// lo cambió) y no son idempotentes a propósito: uno ya cerrado es 23514 con el texto «ya está cerrado». Devuelven `{id, actualizado_en, cerrado_en}`.
const esquemaDeCierre = z.object({
  id: z.guid(),
  actualizado_en: z.string(),
  cerrado_en: z.string().nullable(),
})

async function cambiar(
  rpc: 'repuesto_proyecto_cerrar' | 'repuesto_proyecto_reabrir',
  { id, actualizadoEn }: PedidoDeCierre,
): Promise<ResultadoDeAccion<CierreDeProyecto>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(rpc, {
    p_proyecto: id,
    p_actualizado_en_esperado: actualizadoEn,
  })
  if (error) {
    return rechazoDeProyecto(error)
  }
  const leido = esquemaDeCierre.safeParse(data)
  if (!leido.success) {
    return { ok: false, error: { codigo: 'inesperado', mensaje: NO_SE_LEYO_EL_PROYECTO } }
  }
  return {
    ok: true,
    data: {
      id: leido.data.id,
      actualizadoEn: leido.data.actualizado_en,
      cerradoEn: leido.data.cerrado_en,
    },
  }
}

export const cerrarProyecto = (pedido: PedidoDeCierre) =>
  cambiar('repuesto_proyecto_cerrar', pedido)
export const reabrirProyecto = (pedido: PedidoDeCierre) =>
  cambiar('repuesto_proyecto_reabrir', pedido)
