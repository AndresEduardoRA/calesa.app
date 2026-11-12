// Las notas de una unidad desde el navegador, con la sesión de quien mira (6.04-2, D20): la policy `notas: leer` esconde las borradas y pide ver la unidad. El nombre del autor y el de la fase a la
// que pasó una nota de cambio vienen embebidos en la misma consulta, nunca una lectura por fila. Escribir va por Server Action (`infra/mover/notas.ts`).
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { POR_ALTA, TAMANO_DE_VER_MAS, armarPagina, leerCursor } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import { aplicarCursor, ordenarPorCursor } from '@/shared/lib/supabase/consultas'
import { notasDesde, type NotaDeLaUnidad } from '../../entities/mover/notas'
import type { PaginaDeLaUnidad, PedidoDeLaLista } from '../../entities/mover/pagina-de-la-unidad'

export const NO_SE_LEYERON_LAS_NOTAS = 'No se pudieron cargar las notas.'

// Por `notas_vehiculo_vivas_idx (vehiculo_id, creado_en desc, id desc) where eliminado_en is null` (o `notas_repuesto_id_idx` si es un ítem), con `limit 21`: recorre a lo sumo esas filas, por profundo que sea el cursor.
export async function leerNotasDeLaUnidad({
  unidadId,
  tipo,
  cursor,
  hasta,
}: PedidoDeLaLista): Promise<Resultado<PaginaDeLaUnidad<NotaDeLaUnidad>>> {
  const supabase = createClient()
  const lectura = leerCursor(cursor)
  let consulta = supabase
    .from('notas')
    .select(
      'id, cuerpo, autor_id, historial_fase_id, creado_en, actualizado_en, autor:perfiles!notas_autor_id_fkey(nombre), historial:historial_fases!notas_historial_fase_id_fkey(a:fases!historial_fases_a_fase_id_fkey(nombre))',
    )
    .eq(tipo === 'repuesto' ? 'repuesto_id' : 'vehiculo_id', unidadId)
    .is('eliminado_en', null)
  if (hasta !== null) {
    consulta = consulta.lt('creado_en', hasta)
  }
  const [{ data, error }, sesion] = await Promise.all([
    ordenarPorCursor(aplicarCursor(consulta, lectura, POR_ALTA), lectura, POR_ALTA).limit(
      TAMANO_DE_VER_MAS + 1,
    ),
    supabase.auth.getClaims(),
  ])
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const notas = notasDesde(data, sesion.data?.claims.sub ?? null)
  if (notas === null) {
    return fallo('inesperado', NO_SE_LEYERON_LAS_NOTAS)
  }
  const pagina = armarPagina(notas, TAMANO_DE_VER_MAS, lectura)
  return ok({ filas: pagina.filas, siguiente: pagina.siguiente })
}
