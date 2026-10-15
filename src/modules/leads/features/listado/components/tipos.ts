import type { OrigenDeLead } from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import type { Etiqueta } from '../../../entities/etiqueta'
import type { Etiquetas } from '../../etiquetas/hooks/use-etiquetas'

// Lo que toda pieza del listado necesita para nombrar una fila.
export type DatosDeLaLista = {
  // Todo el layout: la tabla usa los de la tabla; el drawer, los activos.
  campos: readonly CampoDeLead[]
  origenes: readonly OrigenDeLead[]
  // El código de país de la empresa, para mostrar un teléfono («+591 70011002»).
  codigoDePais: string | null
  // Las etiquetas de quien mira: nombran las de cada lead.
  etiquetas: readonly Etiqueta[]
}

// Lo que necesita el «⋯» de cada fila para marcar: la lista de etiquetas (con crear) y abrir «Gestionar».
export type ParaMarcar = {
  etiquetas: Etiquetas
  alGestionar: () => void
}

export function nombreDelOrigen(
  origenes: readonly OrigenDeLead[],
  id: string | null,
): string | null {
  return origenes.find((origen) => origen.id === id)?.nombre ?? null
}
