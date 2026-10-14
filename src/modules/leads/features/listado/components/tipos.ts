import type { OrigenDeLead } from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'

// Lo que toda pieza del listado necesita para nombrar una fila.
export type DatosDeLaLista = {
  // Todo el layout: la tabla usa los de la tabla; el drawer, los activos.
  campos: readonly CampoDeLead[]
  origenes: readonly OrigenDeLead[]
  // El código de país de la empresa, para mostrar un teléfono («+591 70011002»).
  codigoDePais: string | null
}

export function nombreDelOrigen(
  origenes: readonly OrigenDeLead[],
  id: string | null,
): string | null {
  return origenes.find((origen) => origen.id === id)?.nombre ?? null
}
