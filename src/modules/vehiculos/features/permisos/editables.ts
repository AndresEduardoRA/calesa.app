import 'server-only'
import type { Permisos } from '@/shared/lib/permisos'
import { consultarEditables } from '../../composicion'
import { candidatosPorCartera, puedeEditar } from '../../entities/permisos'
import type { Vehiculo } from '../../entities/vehiculo'

type Quien = { permisos: Permisos; usuarioId: string }

// De estos vehículos, cuáles ofrecen «Editar» a esta persona. Casi siempre se sabe sin ir a la
// base (alcance «todos», o lo creó); sólo por los que podría editar por tener a su lead en la
// cartera se le pregunta, y nunca por más que los que se le pasan.
export async function editablesDe(
  quien: Quien,
  vehiculos: readonly Vehiculo[],
): Promise<Set<string>> {
  const candidatos = candidatosPorCartera(quien.permisos, vehiculos, quien.usuarioId)
  const consulta = await consultarEditables(candidatos)
  // Si la consulta falla, esos botones no se ofrecen: la pantalla no se cae por eso.
  const porCartera = new Set(consulta.ok ? consulta.data : [])
  return new Set(
    vehiculos
      .filter((vehiculo) =>
        puedeEditar(quien.permisos, vehiculo, quien.usuarioId, porCartera.has(vehiculo.id)),
      )
      .map((vehiculo) => vehiculo.id),
  )
}
