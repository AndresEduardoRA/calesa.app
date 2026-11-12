// Las unidades de un grupo (embarque, contenedor o declaración), leídas desde el navegador con la sesión de quien mira (6.11-4). Una unidad que la RLS de `vehiculos` no deja ver no llega
// ni se delata. Índices: `transportes_booking_idx` y `transportes_contenedor_idx` (parciales) y la clave de `declaraciones_vehiculos`. El tope es 201: uno más que el máximo de un reparto.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { z } from 'zod'
import {
  MAXIMO_DE_UNIDADES_POR_REPARTO,
  type UnidadDelReparto,
} from '../../entities/dinero/reparto'
import type { GrupoDeLogistica } from '../../entities/nucleo/grupo'

export const NO_SE_CARGARON_LAS_UNIDADES = 'No se pudieron cargar las unidades del grupo.'

const esquemaDeFilas = z.array(
  z.object({
    vehiculo_id: z.guid().nullable(),
    vehiculos: z.object({ id: z.guid(), titulo: z.string() }).nullable(),
  }),
)

export type UnidadesDelGrupo = { unidades: UnidadDelReparto[]; hayMas: boolean }

/** Las unidades del grupo por título y luego por id (así «a las primeras» no cambia entre aperturas), sin repetidas; `hayMas` si pasan de 200. */
export async function leerUnidadesDelGrupo(
  grupo: GrupoDeLogistica,
): Promise<Resultado<UnidadesDelGrupo>> {
  const supabase = createClient()
  const tope = MAXIMO_DE_UNIDADES_POR_REPARTO + 1
  const columnas = 'vehiculo_id, vehiculos(id, titulo)'
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
    return fallo('inesperado', NO_SE_CARGARON_LAS_UNIDADES)
  }
  const vistas = new Set<string>()
  const unidades: UnidadDelReparto[] = []
  for (const fila of filas.data) {
    const v = fila.vehiculos
    if (v && !vistas.has(v.id)) {
      vistas.add(v.id)
      unidades.push({ id: v.id, titulo: v.titulo })
    }
  }
  unidades.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es') || a.id.localeCompare(b.id))
  return ok({
    unidades: unidades.slice(0, MAXIMO_DE_UNIDADES_POR_REPARTO),
    hayMas: filas.data.length > MAXIMO_DE_UNIDADES_POR_REPARTO,
  })
}
