// El intento de crear una importación total (9.06-4b, D46): el id nace con cada archivo armado (D36) y sólo se reusa para el **mismo**
// intento, el mismo texto y el mismo pedido. Así «Reintentar» después de un fallo dudoso da `repetido` sobre la que quizá ya se creó, y nunca
// se crean dos importaciones del mismo archivo; cambiar el destino, el origen o una columna es otro intento, con otro id. Sin I/O.
import type { EntradaCrearImportacion } from './schemas/importacion'

export type Intento = { pedido: EntradaCrearImportacion; texto: string }

export type DatosDelIntento = Omit<EntradaCrearImportacion, 'id'> & { texto: string }

// Las mismas claves, con los mismos valores y en el mismo orden.
function mismoMapeo(
  a: EntradaCrearImportacion['mapeo'],
  b: EntradaCrearImportacion['mapeo'],
): boolean {
  const pa = Object.entries(a)
  const pb = Object.entries(b)
  return (
    pa.length === pb.length &&
    pa.every(([clave, valor], i) => pb[i]?.[0] === clave && pb[i][1] === valor)
  )
}

export function siguienteIntento(
  anterior: Intento | null,
  { texto, entidad, mapeo, asignarA, origenId }: DatosDelIntento,
  nuevoId: () => string = () => crypto.randomUUID(),
): Intento {
  if (
    anterior !== null &&
    anterior.texto === texto &&
    anterior.pedido.entidad === entidad &&
    anterior.pedido.asignarA === asignarA &&
    anterior.pedido.origenId === origenId &&
    mismoMapeo(anterior.pedido.mapeo, mapeo)
  ) {
    return anterior
  }
  return { pedido: { id: nuevoId(), entidad, mapeo, asignarA, origenId }, texto }
}
