// Lo que la persona eligió para subir, antes de que nada toque Storage: qué entra, qué no y por
// qué. Reglas puras; el navegador (decodificar, comprimir, subir) queda afuera.
import { MAXIMO_DE_FOTOS, PESO_MAXIMO_DE_ENTRADA } from './foto'

// Por qué un archivo no se va a subir.
export type MotivoDeRechazo =
  | 'no_es_foto'
  | 'muy_grande'
  // El navegador no pudo decodificarla.
  | 'heic'
  | 'ilegible'
  // Ya está en el vehículo, o dos veces en lo elegido.
  | 'repetida'
  // No queda lugar: el vehículo llegó a 24.
  | 'sin_lugar'

export type Archivo = { nombre: string; tipo: string; peso: number }

// HEIC llega a veces sin tipo (según el sistema): se mira también la extensión.
export function esHeic({ nombre, tipo }: Pick<Archivo, 'nombre' | 'tipo'>): boolean {
  return /^image\/hei[cf]/i.test(tipo) || /\.hei[cf]$/i.test(nombre)
}

// Lo que se sabe sin abrir el archivo. Si es una imagen se decide por el tipo que declara; si de
// verdad se puede leer lo dice el navegador al decodificarla.
export function motivoPorArchivo(archivo: Archivo): 'no_es_foto' | 'muy_grande' | null {
  if (!archivo.tipo.startsWith('image/') && !esHeic(archivo)) {
    return 'no_es_foto'
  }
  return archivo.peso > PESO_MAXIMO_DE_ENTRADA ? 'muy_grande' : null
}

// Por qué no se pudo decodificar: HEIC fuera de Safari es el caso conocido, y tiene salida.
export function motivoDeLectura(archivo: Pick<Archivo, 'nombre' | 'tipo'>): 'heic' | 'ilegible' {
  return esHeic(archivo) ? 'heic' : 'ilegible'
}

const megas = (bytes: number) => Math.round(bytes / (1024 * 1024))

export function mensajeDeRechazo(motivo: MotivoDeRechazo, peso = 0): string {
  switch (motivo) {
    case 'no_es_foto':
      return 'Sólo se pueden subir fotos (JPG, PNG o WebP).'
    case 'muy_grande':
      return `Pesa ${megas(peso)} MB; el máximo por foto es ${megas(PESO_MAXIMO_DE_ENTRADA)} MB.`
    case 'heic':
      return 'Este navegador no puede leer fotos HEIC. Súbela desde el iPhone o expórtala como JPG.'
    case 'ilegible':
      return 'No se pudo leer esta foto. Prueba con otra copia.'
    case 'repetida':
      return 'Ya está en este vehículo.'
    case 'sin_lugar':
      return `No entra: el vehículo admite ${MAXIMO_DE_FOTOS} fotos.`
  }
}

// De las fotos ya leídas (con su hash), cuáles se suben. En el orden en que se eligieron: las
// primeras que caben entran, las repetidas no ocupan lugar.
export function repartirLugar(
  hashes: readonly string[],
  existentes: ReadonlySet<string>,
  lugar: number,
): ('aceptada' | 'repetida' | 'sin_lugar')[] {
  const vistas = new Set<string>()
  let quedan = lugar
  return hashes.map((hash) => {
    if (existentes.has(hash) || vistas.has(hash)) {
      return 'repetida'
    }
    vistas.add(hash)
    if (quedan <= 0) {
      return 'sin_lugar'
    }
    quedan -= 1
    return 'aceptada'
  })
}

const fotos = (cantidad: number) => (cantidad === 1 ? '1 foto' : `${cantidad} fotos`)

// Cuando lo elegido no entra entero: se dice antes de subir, con los números.
export function avisoDeTope(datos: {
  tiene: number
  elegidas: number
  entran: number
}): string | null {
  const { tiene, elegidas, entran } = datos
  if (entran >= elegidas) {
    return null
  }
  if (entran === 0) {
    return `Este vehículo admite ${MAXIMO_DE_FOTOS} fotos y ya las tiene. Elimina alguna para subir otra.`
  }
  const primeras =
    entran === 1 ? 'se va a subir la primera' : `se van a subir las primeras ${entran}`
  return `Este vehículo admite ${MAXIMO_DE_FOTOS} fotos. Tiene ${tiene}: ${primeras} de las ${elegidas} que elegiste.`
}

// Cómo terminó una subida. Un resultado parcial se dice entero: cuántas quedaron y cuántas no.
export function resumenDeSubida(datos: { guardadas: number; fallidas: number }): string {
  const { guardadas, fallidas } = datos
  if (fallidas === 0) {
    return guardadas === 1 ? 'Foto guardada' : `${guardadas} fotos guardadas`
  }
  const total = guardadas + fallidas
  const resto =
    fallidas === 1 ? 'La otra no se pudo subir' : `Las otras ${fallidas} no se pudieron subir`
  if (guardadas === 0) {
    return fallidas === 1
      ? 'La foto no se pudo subir. Revisa tu conexión y reintenta.'
      : `Ninguna de las ${fotos(fallidas)} se pudo subir. Revisa tu conexión y reintenta.`
  }
  return `Se guardaron ${guardadas} de ${total}. ${resto}: revisa tu conexión y reintenta.`
}
