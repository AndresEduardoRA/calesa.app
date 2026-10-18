import type { AccionDeFila } from '../../../entities/acciones-de-fila'
import type { TipoDeLeadEnCatalogo } from '../../../entities/catalogos'
import type { OrigenDeLead } from '../../../entities/alta'
import type { OrigenConEstado } from '../../../entities/ficha'
import type { CampoDeLead } from '../../../entities/campo'
import type { Etiqueta } from '../../../entities/etiqueta'
import type { FilaDeLead } from '../../../entities/listado'
import type { Etiquetas } from '../../etiquetas/hooks/use-etiquetas'

// Lo que toda pieza del listado necesita para nombrar una fila.
export type DatosDeLaLista = {
  // Todo el layout: la tabla usa los de la tabla; el drawer, los activos.
  campos: readonly CampoDeLead[]
  origenes: readonly OrigenConEstado[]
  // Los tipos de lead, también los apagados: nombran la columna «Tipo» y el resumen.
  tipos: readonly TipoDeLeadEnCatalogo[]
  // El código de país de la empresa, para mostrar un teléfono («+591 70011002»).
  codigoDePais: string | null
  // Las etiquetas de quien mira: nombran las de cada lead.
  etiquetas: readonly Etiqueta[]
}

// Lo que necesita el «⋯» de cada fila: la lista de etiquetas (con crear), abrir «Gestionar», qué
// filas se pueden enviar a la papelera y anotar o agendar sobre una.
export type ParaMarcar = {
  etiquetas: Etiquetas
  alGestionar: () => void
  // Los de la página que quien mira puede enviar a la papelera.
  eliminables: readonly string[]
  // Con `leads.editar`: abrir el modal de anotar o agendar sobre un lead. Nulo sin el permiso.
  alAccion: ((accion: AccionDeFila, leadId: string) => void) | null
}

// Anotar y agendar en el «⋯» de una fila: sólo con el permiso y el lead en la cartera.
export function accionesDelMenu(marcar: ParaMarcar, lead: FilaDeLead) {
  const { alAccion } = marcar
  if (alAccion === null || !lead.enCartera) {
    return undefined
  }
  return {
    alAnotar: () => {
      alAccion('anotar', lead.id)
    },
    alAgendar: () => {
      alAccion('agendar', lead.id)
    },
  }
}

export function nombreDelOrigen(
  origenes: readonly OrigenDeLead[],
  id: string | null,
): string | null {
  return origenes.find((origen) => origen.id === id)?.nombre ?? null
}
