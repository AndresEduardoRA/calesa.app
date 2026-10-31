// Las claves de la hoja de cotizar: la `key` de React con la que se vuelve a montar, y las de la pestaña (`sessionStorage`) donde viven el pendiente del guardado y el
// borrador. El pendiente es por persona y por hoja (origen, lead y vehículo): otra hoja, u otra cuenta que entra en la misma pestaña, no reenvía el de ésta. El borrador
// es por persona, origen y vehículo, **sin el lead** (4.14-3b, P1): elegir o cambiar el cliente vuelve a montar la hoja y lo tipeado se repone con su aviso.

// Lleva la hoja abierta: cada una nueva («Recargar», «Usar la versión nueva», un `router.refresh()` con la misma versión) vuelve a montar la hoja, así el recálculo y el guardado
// usan la misma (D2) y el borrador repone lo tipeado. `vuelta` la sube el marco para volver a montarla vacía («Descartar»).
export const claveDeLaHoja = ({
  formulaId,
  vehiculoId,
  vuelta,
  abierta,
}: {
  formulaId: string
  vehiculoId: string | null
  vuelta: number
  abierta: string
}): string => `${formulaId}:${vehiculoId ?? '-'}:${String(vuelta)}:${abierta}`

// La hoja de una persona en la pestaña.
export type DeLaPestana = {
  personaId: string
  origenId: string
  leadId: string | null
  vehiculoId: string | null
}

const deLaHoja = ({ personaId, origenId, leadId, vehiculoId }: DeLaPestana) =>
  `${personaId}:${origenId}:${leadId ?? '-'}:${vehiculoId ?? '-'}`

export const claveDelPendiente = (h: DeLaPestana): string => `cotizar-pendiente:${deLaHoja(h)}`

// `leadId` se acepta y se ignora: quien llama arma una sola `DeLaPestana` para el borrador y el pendiente.
export const claveDelBorrador = ({
  personaId,
  origenId,
  vehiculoId,
}: Omit<DeLaPestana, 'leadId'> & { leadId?: string | null }): string =>
  `cotizar:${personaId}:${origenId}:${vehiculoId ?? '-'}`
