// El lote de un grupo (6.04-3, contenedor o reserva): de las unidades del grupo entran las que están en **una misma fase** (D1: un lote no mezcla fases). Reglas puras, sin I/O.

export type UnidadDelGrupo = {
  id: string
  titulo: string
  // Nulo: sin fase, no entra.
  faseId: string | null
  faseNombre: string | null
  faseOrden: number | null
}

export type UnidadesDelGrupo = {
  fase: { id: string; nombre: string } | null
  entran: UnidadDelGrupo[]
  // Las que están en otra fase o sin fase.
  fuera: number
}

function ordenDe(lista: readonly UnidadDelGrupo[]): number {
  return lista[0]?.faseOrden ?? Number.MAX_SAFE_INTEGER
}

// Más unidades primero; en empate, la fase de menor orden.
function esMejor(lista: readonly UnidadDelGrupo[], actual: readonly UnidadDelGrupo[]): boolean {
  if (lista.length !== actual.length) return lista.length > actual.length
  return ordenDe(lista) < ordenDe(actual)
}

function agruparPorFase(unidades: readonly UnidadDelGrupo[]): UnidadDelGrupo[][] {
  const porFase = new Map<string, UnidadDelGrupo[]>()
  for (const u of unidades) {
    if (u.faseId !== null) porFase.set(u.faseId, [...(porFase.get(u.faseId) ?? []), u])
  }
  return [...porFase.values()]
}

/** La fase con más unidades (en empate, la de menor orden). Sin fase no entra: cuenta en `fuera`. */
export function unidadesDelGrupo(unidades: readonly UnidadDelGrupo[]): UnidadesDelGrupo {
  const mejor = agruparPorFase(unidades).reduce<UnidadDelGrupo[]>(
    (actual, lista) => (esMejor(lista, actual) ? lista : actual),
    [],
  )
  const primera = mejor[0]
  if (primera?.faseId == null) return { fase: null, entran: [], fuera: unidades.length }
  return {
    fase: { id: primera.faseId, nombre: primera.faseNombre ?? 'Sin nombre' },
    entran: mejor,
    fuera: unidades.length - mejor.length,
  }
}

/** «Se eligieron 7 de 8; 1 está en otra fase y no entra.» / «Se eligieron 8.» */
export function fraseDelGrupo(entran: number, fuera: number): string {
  if (fuera === 0) return `Se eligieron ${String(entran)}.`
  const estan = fuera === 1 ? 'está' : 'están'
  return `Se eligieron ${String(entran)} de ${String(entran + fuera)}; ${String(fuera)} ${estan} en otra fase y no ${fuera === 1 ? 'entra' : 'entran'}.`
}
