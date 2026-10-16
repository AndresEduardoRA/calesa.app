// Anotar un seguimiento o agendar un recordatorio desde el «⋯» de una fila del listado, sin abrir el
// drawer ni la ficha. El lead va en `?para=<id>`: `?lead=` abre el drawer. El panel es el mismo de la
// ficha (`?panel=anotar-seguimiento` o `?panel=agendar-recordatorio`); con `para`, lo atiende el
// listado y no la ficha ni el drawer.
import { z } from 'zod'
import { PANEL_ANOTAR_SEGUIMIENTO } from './edicion-de-seguimiento'
import type { FilaDeLead } from './listado'
import { PANEL_AGENDAR_RECORDATORIO } from './recordatorios'

export const CLAVE_PARA = 'para'

export const ACCIONES_DE_FILA = {
  anotar: PANEL_ANOTAR_SEGUIMIENTO,
  agendar: PANEL_AGENDAR_RECORDATORIO,
} as const
export type AccionDeFila = keyof typeof ACCIONES_DE_FILA

// La acción que nombra la URL (nula si el panel no es una de ellas o no hay `para`).
export function accionDeLaUrl(panel: string | null, para: string | null): AccionDeFila | null {
  if (para === null) {
    return null
  }
  const accion = (Object.keys(ACCIONES_DE_FILA) as AccionDeFila[]).find(
    (clave) => ACCIONES_DE_FILA[clave] === panel,
  )
  return accion ?? null
}

const ES_GUID = z.guid()

// La fila sobre la que se actúa: una de esta página, de la cartera de quien mira, que tiene
// `leads.editar`. Otra cosa (inventada, ajena, de otra página) es nula: el listado lo dice igual que
// un lead que no existe. La base vuelve a decidir al guardar.
export function filaParaAccion(
  filas: readonly FilaDeLead[],
  para: string,
  puedeAnotar: boolean,
): FilaDeLead | null {
  if (!puedeAnotar || !ES_GUID.safeParse(para).success) {
    return null
  }
  return filas.find((fila) => fila.id === para && fila.enCartera) ?? null
}
