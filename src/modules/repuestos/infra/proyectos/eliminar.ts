import 'server-only'
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { createClient } from '@/shared/lib/supabase/server'
import { NO_SE_LEYO_EL_PROYECTO, rechazoDeProyecto } from '../../entities/proyectos/errores'
import type {
  EliminacionDeProyecto,
  PedidoDeCierre,
  RestauracionDeProyecto,
} from '../../entities/proyectos/repositorio'

// Eliminar y restaurar un proyecto es sólo por RPC (`repuesto_proyecto_eliminar` y `_restaurar`, 8.08-1): piden `repuestos.editar`; eliminar, además, la versión que se vio (`PT409`) y que no
// tenga ítems vivos, compras, pagos ni cotizaciones (23514 `en_uso` con su texto); restaurar, el `eliminado_en` que devolvió eliminar (`PT409` si ya no se puede) y que el vehículo no tenga
// otro proyecto (23505). `eliminado_en` no tiene grant: no hay `.update()` posible.
const esquemaDeEliminado = z.object({ id: z.guid(), eliminado_en: z.string() })
const esquemaDeRestaurado = z.object({ id: z.guid(), actualizado_en: z.string() })

const NO_SE_LEYO = {
  ok: false,
  error: { codigo: 'inesperado', mensaje: NO_SE_LEYO_EL_PROYECTO },
} as const

export async function eliminarProyecto({
  id,
  actualizadoEn,
}: PedidoDeCierre): Promise<ResultadoDeAccion<EliminacionDeProyecto>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('repuesto_proyecto_eliminar', {
    p_proyecto: id,
    p_actualizado_en_esperado: actualizadoEn,
  })
  if (error) {
    return rechazoDeProyecto(error)
  }
  const leido = esquemaDeEliminado.safeParse(data)
  return leido.success
    ? { ok: true, data: { id: leido.data.id, eliminadoEn: leido.data.eliminado_en } }
    : NO_SE_LEYO
}

export async function restaurarProyecto({
  id,
  eliminadoEn,
}: {
  id: string
  eliminadoEn: string
}): Promise<ResultadoDeAccion<RestauracionDeProyecto>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('repuesto_proyecto_restaurar', {
    p_proyecto: id,
    p_eliminado_en_esperado: eliminadoEn,
  })
  if (error) {
    return rechazoDeProyecto(error)
  }
  const leido = esquemaDeRestaurado.safeParse(data)
  return leido.success
    ? { ok: true, data: { id: leido.data.id, actualizadoEn: leido.data.actualizado_en } }
    : NO_SE_LEYO
}
