// Las claves de la hoja de cotizar: la `key` de React con la que se vuelve a montar, y las de la pestaña (`sessionStorage`) donde viven el pendiente del guardado y el
// borrador. Las de la pestaña son por hoja (origen, lead y vehículo): otra hoja no reenvía el pendiente ni repone el borrador de ésta. No llevan a la persona (4-38).

export const claveDeLaHoja = ({
  formulaId,
  vehiculoId,
}: {
  formulaId: string
  vehiculoId: string | null
}): string => `${formulaId}:${vehiculoId ?? '-'}`

const deLaHoja = (origenId: string, leadId: string | null, vehiculoId: string | null) =>
  `${origenId}:${leadId ?? '-'}:${vehiculoId ?? '-'}`

export const claveDelPendiente = (
  origenId: string,
  leadId: string | null,
  vehiculoId: string | null,
): string => `cotizar-pendiente:${deLaHoja(origenId, leadId, vehiculoId)}`

export const claveDelBorrador = (
  origenId: string,
  leadId: string | null,
  vehiculoId: string | null,
): string => `cotizar:${deLaHoja(origenId, leadId, vehiculoId)}`
