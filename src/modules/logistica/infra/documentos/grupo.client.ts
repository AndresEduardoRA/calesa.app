// Las unidades de un grupo (embarque, contenedor o declaración) para subirles un documento, leídas desde el navegador con la sesión de quien mira (6.06-3). Una unidad que la RLS de
// `vehiculos` no deja ver no llega ni se delata. Índices: `transportes_booking_idx` y `transportes_contenedor_idx` (parciales) y la clave de `declaraciones_vehiculos`. El tope es 101: uno
// más que lo que `documento_registrar` acepta por pedido, para saber si el grupo se pasa. Un área no importa otra: esto es una copia de la lectura de `dinero`.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { z } from 'zod'
import { MAXIMO_DE_UNIDADES_POR_DOCUMENTO } from '../../entities/documentos/destino'
import type { GrupoDeLogistica } from '../../entities/nucleo/grupo'

export const NO_SE_CARGARON_LAS_UNIDADES_DEL_GRUPO = 'No se pudieron cargar las unidades del grupo.'

const esquemaDeFilas = z.array(
  z.object({ vehiculos: z.object({ id: z.guid(), origen_id: z.guid() }).nullable() }),
)

export type UnidadDelGrupo = { id: string; origenId: string }
export type UnidadesDelGrupo = { unidades: UnidadDelGrupo[]; hayMas: boolean }

/** Las unidades del grupo sin repetidas, por id; `hayMas` si pasan de 100. */
export async function leerUnidadesDelGrupo(
  grupo: GrupoDeLogistica,
): Promise<Resultado<UnidadesDelGrupo>> {
  const supabase = createClient()
  const tope = MAXIMO_DE_UNIDADES_POR_DOCUMENTO + 1
  const columnas = 'vehiculos(id, origen_id)'
  const { data, error } =
    grupo.tipo === 'declaracion'
      ? await supabase
          .from('declaraciones_vehiculos')
          .select(columnas)
          .eq('declaracion_id', grupo.id)
          .is('removido_en', null)
          .limit(tope)
      : await supabase
          .from('transportes')
          .select(columnas)
          .eq(grupo.tipo === 'embarque' ? 'booking' : 'contenedor', grupo.id)
          .not('vehiculo_id', 'is', null)
          .limit(tope)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = esquemaDeFilas.safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', NO_SE_CARGARON_LAS_UNIDADES_DEL_GRUPO)
  }
  const vistas = new Map<string, UnidadDelGrupo>()
  for (const fila of filas.data) {
    const v = fila.vehiculos
    if (v && !vistas.has(v.id)) vistas.set(v.id, { id: v.id, origenId: v.origen_id })
  }
  const unidades = [...vistas.values()].sort((a, b) => a.id.localeCompare(b.id))
  return ok({
    unidades: unidades.slice(0, MAXIMO_DE_UNIDADES_POR_DOCUMENTO),
    hayMas: filas.data.length > MAXIMO_DE_UNIDADES_POR_DOCUMENTO,
  })
}
