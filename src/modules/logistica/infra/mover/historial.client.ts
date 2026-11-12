// El historial de fases de una unidad desde el navegador, con la sesión de quien mira (6.04-2, D20): la policy de `historial_fases` pide `logistica.ver` en la unidad. Las fases y la persona vienen
// embebidas en la misma consulta.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { POR_ALTA, TAMANO_DE_VER_MAS, armarPagina, leerCursor } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import { aplicarCursor, ordenarPorCursor } from '@/shared/lib/supabase/consultas'
import { cambiosDesde, type CambioDeFase } from '../../entities/mover/historial'
import type { PaginaDeLaUnidad, PedidoDeLaLista } from '../../entities/mover/pagina-de-la-unidad'

export const NO_SE_LEYO_EL_HISTORIAL = 'No se pudo cargar el historial.'

// Por `historial_fases_vehiculo_idx (vehiculo_id, creado_en)`, caminado hacia atrás, con `limit 21`: ordena a lo sumo esas filas, por profundo que sea el cursor.
export async function leerHistorialDeLaUnidad({
  unidadId,
  cursor,
  hasta,
}: PedidoDeLaLista): Promise<Resultado<PaginaDeLaUnidad<CambioDeFase>>> {
  const lectura = leerCursor(cursor)
  let consulta = createClient()
    .from('historial_fases')
    .select(
      'id, creado_en, nota, de:fases!historial_fases_de_fase_id_fkey(nombre), a:fases!historial_fases_a_fase_id_fkey(nombre), quien:perfiles!historial_fases_usuario_id_fkey(nombre)',
    )
    .eq('vehiculo_id', unidadId)
  if (hasta !== null) {
    consulta = consulta.lt('creado_en', hasta)
  }
  const { data, error } = await ordenarPorCursor(
    aplicarCursor(consulta, lectura, POR_ALTA),
    lectura,
    POR_ALTA,
  ).limit(TAMANO_DE_VER_MAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const cambios = cambiosDesde(data)
  if (cambios === null) {
    return fallo('inesperado', NO_SE_LEYO_EL_HISTORIAL)
  }
  const pagina = armarPagina(
    cambios.map((c) => ({ ...c })),
    TAMANO_DE_VER_MAS,
    lectura,
  )
  return ok({ filas: pagina.filas, siguiente: pagina.siguiente })
}
