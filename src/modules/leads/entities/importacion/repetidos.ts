// Un teléfono repetido dentro del archivo: el mismo número, normalizado, desde su segunda aparición ya no entra. `vistos` (número → la fila
// donde apareció primero) lo lleva quien prepara, y cruza los tramos (9.06-4b). Sin I/O.
import { CLAVE_DEL_ALTA } from '../alta'
import { normalizarTelefono } from '../telefono'

type FilaConTelefono = {
  fila: number
  pedido: { lead: { telefono_principal: string } } | null
  motivos: readonly { campo: string | null; motivo: string }[]
}

export function marcarRepetido<F extends FilaConTelefono>(
  fila: F,
  vistos: Map<string, number>,
  telefonoCc: Parameters<typeof normalizarTelefono>[0],
): F {
  const telefono = fila.pedido?.lead.telefono_principal
  const normalizado = telefono === undefined ? null : normalizarTelefono(telefonoCc, telefono)
  if (!normalizado?.ok) {
    return fila
  }
  const primera = vistos.get(normalizado.numero)
  if (primera === undefined) {
    vistos.set(normalizado.numero, fila.fila)
    return fila
  }
  return {
    ...fila,
    pedido: null,
    motivos: [
      {
        campo: CLAVE_DEL_ALTA.telefono,
        motivo: `Este teléfono ya está en la fila ${String(primera)} del archivo.`,
      },
    ],
  }
}
