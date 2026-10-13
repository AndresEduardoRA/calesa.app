// Las fotos de un vehículo: hasta 24, una sola portada. Cada foto son dos objetos del bucket
// `vehiculos` (la completa y su miniatura), generados en el navegador.
import { z } from 'zod'

export const MAXIMO_DE_FOTOS = 24
// Lado mayor de la miniatura: la que cargan el listado y la grilla.
export const LADO_DE_MINIATURA = 480
// Lo que pesa, como mucho, el archivo que elige la persona (lo que se sube pesa cien veces menos).
export const PESO_MAXIMO_DE_ENTRADA = 25 * 1024 * 1024

export type Foto = {
  id: string
  // El SHA-256 del archivo que eligió la persona: la misma foto no entra dos veces al vehículo.
  hash: string
  // Rutas en el bucket: la completa (≤ 1600 px) y la miniatura (≤ 480 px).
  ruta: string
  rutaMiniatura: string
  // Medidas de la completa.
  ancho: number
  alto: number
  bytes: number
  // 1..n, corrido.
  orden: number
  esPortada: boolean
}

// Las fotos y su versión, que es otra que la de la ficha: mover, fijar portada y eliminar la
// mandan. Sin fotos todavía no hay versión.
export type Galeria = { fotos: Foto[]; version: string | null }

// Una foto cuyos dos objetos ya están en Storage: lo que falta es su fila.
export type FotoSubida = Pick<Foto, 'hash' | 'ruta' | 'rutaMiniatura' | 'ancho' | 'alto' | 'bytes'>

// Una foto recién eliminada, tal como estaba: lo que «Deshacer» necesita para devolverla a su lugar.
export type FotoEliminada = FotoSubida & Pick<Foto, 'orden' | 'esPortada'>

export const COLUMNAS_DE_FOTO =
  'id, hash, ruta, ruta_miniatura, ancho, alto, bytes, orden, es_portada'

const esquemaFotos = z.array(
  z.object({
    id: z.guid(),
    hash: z.string(),
    ruta: z.string(),
    ruta_miniatura: z.string(),
    ancho: z.number(),
    alto: z.number(),
    bytes: z.number(),
    orden: z.number(),
    es_portada: z.boolean(),
  }),
)

// En su orden, venga como venga la consulta.
export function fotosDesde(filas: unknown): Foto[] {
  return esquemaFotos
    .parse(filas)
    .map((fila) => ({
      id: fila.id,
      hash: fila.hash,
      ruta: fila.ruta,
      rutaMiniatura: fila.ruta_miniatura,
      ancho: fila.ancho,
      alto: fila.alto,
      bytes: fila.bytes,
      orden: fila.orden,
      esPortada: fila.es_portada,
    }))
    .sort((a, b) => a.orden - b.orden)
}

const esquemaEliminada = z.object({
  hash: z.string(),
  ruta: z.string(),
  ruta_miniatura: z.string(),
  ancho: z.number(),
  alto: z.number(),
  bytes: z.number(),
  orden: z.number(),
  es_portada: z.boolean(),
})

// Lo que devuelve `vehiculo_foto_eliminar`; null = ya no estaba (un reintento).
export function fotoEliminadaDesde(fila: unknown): FotoEliminada | null {
  if (fila === null || fila === undefined) {
    return null
  }
  const foto = esquemaEliminada.parse(fila)
  return {
    hash: foto.hash,
    ruta: foto.ruta,
    rutaMiniatura: foto.ruta_miniatura,
    ancho: foto.ancho,
    alto: foto.alto,
    bytes: foto.bytes,
    orden: foto.orden,
    esPortada: foto.es_portada,
  }
}

// Cuántas fotos más admite.
export function lugarPara(fotos: readonly unknown[]): number {
  return Math.max(0, MAXIMO_DE_FOTOS - fotos.length)
}

// Una foto se mueve «después de» otra (null = primera), no a una posición: si alguien agregó una
// mientras tanto, queda junto a la vecina que se eligió. null = ya está en ese borde.
export type Direccion = 'antes' | 'despues'

export function destinoDeMovimiento(
  fotos: readonly Pick<Foto, 'id'>[],
  id: string,
  direccion: Direccion,
): { despuesDe: string | null } | null {
  const posicion = fotos.findIndex((foto) => foto.id === id)
  if (posicion === -1) {
    return null
  }
  if (direccion === 'antes') {
    // Un lugar antes es «después de la que está dos antes» (o primera).
    return posicion === 0 ? null : { despuesDe: fotos[posicion - 2]?.id ?? null }
  }
  const siguiente = fotos[posicion + 1]
  return siguiente ? { despuesDe: siguiente.id } : null
}

// `<vehículo>/<sha-256 del contenido>.<webp|jpg>`: lo único que produce la subida. La base lo
// vuelve a comprobar (una fila no nace con una ruta de la carpeta de otro vehículo).
export function esRutaDeFoto(vehiculoId: string, ruta: string): boolean {
  const [carpeta, archivo, ...resto] = ruta.split('/')
  return (
    resto.length === 0 &&
    carpeta === vehiculoId &&
    archivo !== undefined &&
    /^[0-9a-f]{64}\.(webp|jpg)$/.test(archivo)
  )
}
