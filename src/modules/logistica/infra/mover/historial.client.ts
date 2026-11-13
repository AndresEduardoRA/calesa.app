// El historial de fases de una unidad desde el navegador, con la sesión de quien mira (6.04-2, D20): la policy de `historial_fases` pide `logistica.ver` en la unidad. Las fases y la persona vienen
// embebidas en la misma consulta.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import { citar } from '@/shared/lib/supabase/consultas'
import {
  codificarCursorDeHistorial,
  leerCursorDeHistorial,
} from '../../entities/mover/cursor-de-historial'
import { cambiosDesde, type CambioDeFase } from '../../entities/mover/historial'
import type { PaginaDeLaUnidad, PedidoDeLaLista } from '../../entities/mover/pagina-de-la-unidad'

export const NO_SE_LEYO_EL_HISTORIAL = 'No se pudo cargar el historial.'

// Por `historial_fases_vehiculo_idx (vehiculo_id, creado_en)` (o `historial_fases_repuesto_idx` si es un ítem), caminado hacia atrás, con `limit 21`: ordena a lo sumo esas filas, por profundo que sea el cursor. El `id` (un `bigint`)
// desempata; el borde del cursor es el de `aplicarCursor()` de `shared`: `creado_en <= instante` y (`<` o el mismo instante con menor `id`).
export async function leerHistorialDeLaUnidad({
  unidadId,
  tipo,
  cursor,
  hasta,
}: PedidoDeLaLista): Promise<Resultado<PaginaDeLaUnidad<CambioDeFase>>> {
  const lectura = leerCursorDeHistorial(cursor)
  let consulta = createClient()
    .from('historial_fases')
    .select(
      'id, creado_en, nota, de:fases!historial_fases_de_fase_id_fkey(nombre), a:fases!historial_fases_a_fase_id_fkey(nombre), quien:perfiles!historial_fases_usuario_id_fkey(nombre)',
    )
    .eq(tipo === 'repuesto' ? 'repuesto_id' : 'vehiculo_id', unidadId)
  if (hasta !== null) {
    consulta = consulta.lt('creado_en', hasta)
  }
  if (lectura !== null) {
    consulta = consulta
      .lte('creado_en', lectura.instante)
      .or(`creado_en.lt.${citar(lectura.instante)},id.lt.${String(lectura.id)}`)
  }
  const { data, error } = await consulta
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(TAMANO_DE_VER_MAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const cambios = cambiosDesde(data)
  if (cambios === null) {
    return fallo('inesperado', NO_SE_LEYO_EL_HISTORIAL)
  }
  const filas = cambios.slice(0, TAMANO_DE_VER_MAS)
  const ultima = filas.at(-1)
  const hayMas = cambios.length > TAMANO_DE_VER_MAS
  return ok({
    filas,
    siguiente:
      hayMas && ultima
        ? codificarCursorDeHistorial({ instante: ultima.creadoEn, id: ultima.id })
        : null,
  })
}
