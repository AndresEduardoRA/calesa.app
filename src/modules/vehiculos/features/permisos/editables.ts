import 'server-only'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { consultarEditables, consultarLeadsVisibles, consultarPermiso } from '../../composicion'
import { candidatosPorCartera, puedeEditar, puedeSobre } from '../../entities/permisos'
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

// De estos vehículos, cuáles puede enviar a la papelera. La misma regla y el mismo camino que
// «Editar», con `vehiculos.eliminar`.
export async function eliminablesDe(
  quien: Quien,
  vehiculos: readonly Vehiculo[],
): Promise<Set<string>> {
  const clave = 'vehiculos.eliminar'
  const candidatos = candidatosPorCartera(quien.permisos, vehiculos, quien.usuarioId, clave)
  const consulta = await consultarPermiso(candidatos, clave)
  const porCartera = new Set(consulta.ok ? consulta.data : [])
  return new Set(
    vehiculos
      .filter((vehiculo) => puedeSobre({ ...quien, clave }, vehiculo, porCartera.has(vehiculo.id)))
      .map((vehiculo) => vehiculo.id),
  )
}

// De estos vehículos, cuáles tienen un lead que esta persona puede abrir: decide si el aviso de «está vinculado» ofrece «Ver el lead». Sólo se
// pregunta por los que tienen lead, los puede enviar a la papelera (los demás no muestran ese aviso) y si tiene `leads.ver`: casi siempre son
// cero ids y no se va a la base. Si la consulta falla, no se ofrece.
export async function leadsVisiblesDe(
  quien: Quien,
  vehiculos: readonly Pick<Vehiculo, 'id' | 'leadId'>[],
  eliminables: ReadonlySet<string>,
): Promise<Set<string>> {
  if (!puede(quien.permisos, 'leads.ver')) {
    return new Set()
  }
  const candidatos = vehiculos
    .filter((vehiculo) => vehiculo.leadId !== null && eliminables.has(vehiculo.id))
    .map((vehiculo) => vehiculo.id)
  const consulta = await consultarLeadsVisibles(candidatos)
  return new Set(consulta.ok ? consulta.data : [])
}
