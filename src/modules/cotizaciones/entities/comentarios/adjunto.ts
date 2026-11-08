// Los adjuntos de una cotización como los lee y los sube la pantalla (4.27-3): los tipos que admite el bucket `cotizaciones`, el tope, el nombre que se guarda y
// quién quita. Espeja `cotizacion_adjuntar` y `cotizacion_adjunto_quitar` (4.27-1), que deciden igual: acá sólo se evita subir lo que la base rechazaría y dibujar
// lo que no se puede. Nada de React ni de Supabase.
import { z } from 'zod'
import { formatearNumero } from '@/shared/lib/formato'

// Hasta 20 por cotización y 25 MB por archivo: los de la base y el bucket.
export const TOPE_DE_ADJUNTOS = 20
export const PESO_MAXIMO_DE_ADJUNTO = 26_214_400
// El bucket privado de las cotizaciones. El único lugar que lo nombra: un `.from('<literal>')` lo leería la guarda de escala como una consulta sin tope.
export const BUCKET_DE_ADJUNTOS = 'cotizaciones'

export const MIME_DE_PDF = 'application/pdf'
export const MIME_DE_WORD =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
// Los tipos que admiten el bucket y `cotizacion_adjuntar`, y el de cada extensión de imagen que sale del navegador.
export const MIMES_DE_ADJUNTO = [
  MIME_DE_PDF,
  MIME_DE_WORD,
  'image/webp',
  'image/jpeg',
  'image/png',
] as const
export type MimeDeAdjunto = (typeof MIMES_DE_ADJUNTO)[number]
export const MIME_DE_IMAGEN = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  png: 'image/png',
} as const satisfies Record<string, MimeDeAdjunto>

// Lo que ofrece el selector del sistema; lo soltado no pasa por ahí y se revisa con `repartirElegidos`.
export const TIPOS_QUE_SE_ELIGEN = `${MIME_DE_PDF},image/*,.docx,${MIME_DE_WORD}`

export const MENSAJE_DEL_TOPE = 'Una cotización admite hasta 20 adjuntos.'

// Una imagen se sube convertida (WebP, o JPEG si el navegador no codifica WebP); PDF y Word, tal cual.
export type ClaseDeArchivo = 'pdf' | 'imagen' | 'docx'

export type Adjunto = {
  id: string
  ruta: string
  nombre: string
  mime: string
  bytes: number
  // El texto de la base.
  creadoEn: string
  autor: { nombre: string | null }
  // Lo subió quien mira (el `sub` de su sesión es `subido_por`).
  mio: boolean
}

// Lo que se manda a registrar tras subir el archivo.
export type ArchivoSubido = Pick<Adjunto, 'ruta' | 'nombre' | 'bytes'> & { mime: MimeDeAdjunto }

const EXTENSIONES = /\.([a-z0-9]+)$/i

function extensionDelNombre(nombre: string): string | null {
  return EXTENSIONES.exec(nombre)?.[1]?.toLowerCase() ?? null
}

// Por el `type` del navegador; un PDF o Word sin `type` (pasa al soltarlos en algunos sistemas), por la extensión.
export function claseDeArchivo(archivo: { name: string; type: string }): ClaseDeArchivo | null {
  if (archivo.type === MIME_DE_PDF) {
    return 'pdf'
  }
  if (archivo.type === MIME_DE_WORD) {
    return 'docx'
  }
  if (archivo.type.startsWith('image/')) {
    return 'imagen'
  }
  if (archivo.type === '') {
    const extension = extensionDelNombre(archivo.name)
    return extension === 'pdf' ? 'pdf' : extension === 'docx' ? 'docx' : null
  }
  return null
}

// Qué se sube de lo elegido y qué no (con su motivo, uno por línea), sin subir nada. Una imagen se mide después de convertirla.
export function repartirElegidos<T extends { name: string; type: string; size: number }>(
  archivos: readonly T[],
  cargados: number,
): { aceptados: T[]; rechazos: string[] } {
  const aceptados: T[] = []
  const rechazos: string[] = []
  let sinLugar = false
  for (const archivo of archivos) {
    const clase = claseDeArchivo(archivo)
    if (clase === null) {
      rechazos.push(`${archivo.name}: sólo PDF, imágenes o Word.`)
    } else if (clase !== 'imagen' && archivo.size > PESO_MAXIMO_DE_ADJUNTO) {
      rechazos.push(`${archivo.name} pesa más de 25 MB.`)
    } else if (cargados + aceptados.length >= TOPE_DE_ADJUNTOS) {
      sinLugar = true
    } else {
      aceptados.push(archivo)
    }
  }
  if (sinLugar) {
    rechazos.push(MENSAJE_DEL_TOPE)
  }
  return { aceptados, rechazos }
}

const LARGO_DEL_NOMBRE = 200
const PROHIBIDOS = /[/\\\u0000]/g

// El nombre que se guarda: sin barras ni nulos, con la extensión de lo que de verdad se sube (`foto.HEIC` convertida es `foto.webp`) y a lo sumo 200 caracteres.
export function nombreDelAdjunto(original: string, extension: string): string {
  const limpio = original.replace(PROHIBIDOS, '').trim()
  const punto = limpio.lastIndexOf('.')
  const base = (punto > 0 ? limpio.slice(0, punto) : limpio).trim()
  const sufijo = `.${extension}`
  const recortada = base.slice(0, LARGO_DEL_NOMBRE - sufijo.length).trimEnd()
  return `${recortada === '' ? 'archivo' : recortada}${sufijo}`
}

const KB = 1024
const MB = KB * KB

// «340 KB», «1,2 MB». Nunca «0 KB»: un archivo vacío no se adjunta.
export function tamanoLegible(bytes: number, locale?: string): string {
  if (bytes < MB) {
    return `${formatearNumero(Math.max(1, Math.round(bytes / KB)), { locale, decimales: 0 })} KB`
  }
  return `${formatearNumero(bytes / MB, { locale, decimales: 1 })} MB`
}

// Quitar: quien lo subió mientras todavía puede adjuntar, o quien modera (lo ajeno también). El espejo de `cotizacion_adjunto_quitar`.
export function puedeQuitarAdjunto(
  adjunto: Pick<Adjunto, 'mio'>,
  quien: { puedeAdjuntar: boolean; puedeModerar: boolean },
): boolean {
  return (adjunto.mio && quien.puedeAdjuntar) || quien.puedeModerar
}

const esquemaFila = z.object({
  id: z.guid(),
  ruta: z.string(),
  nombre: z.string(),
  mime: z.string(),
  bytes: z.number().int(),
  creado_en: z.string(),
  subido_por: z.guid().nullable(),
  autor: z.object({ nombre: z.string().nullable() }).nullable(),
})

const esquemaRegistrado = esquemaFila.pick({
  id: true,
  ruta: true,
  nombre: true,
  mime: true,
  bytes: true,
  creado_en: true,
})

// Las filas de `cotizaciones_adjuntos` con el nombre de quien subió cada una. Una forma que no cuadra es null: un error, nunca una lista vacía.
export function adjuntosDesde(crudo: unknown, yo: string | null): Adjunto[] | null {
  const leidas = z.array(esquemaFila).safeParse(crudo)
  if (!leidas.success) {
    return null
  }
  return leidas.data.map((fila) => ({
    id: fila.id,
    ruta: fila.ruta,
    nombre: fila.nombre,
    mime: fila.mime,
    bytes: fila.bytes,
    creadoEn: fila.creado_en,
    autor: { nombre: fila.autor?.nombre ?? null },
    mio: yo !== null && fila.subido_por === yo,
  }))
}

// Lo que devuelve `cotizacion_adjuntar`: el adjunto recién registrado, de quien lo subió.
export function adjuntoRegistradoDesde(crudo: unknown): Adjunto | null {
  const leido = esquemaRegistrado.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const { creado_en: creadoEn, ...resto } = leido.data
  return { ...resto, creadoEn, autor: { nombre: null }, mio: true }
}

// Quién lo subió, como se lee en la lista.
export function autorDelAdjunto(adjunto: Pick<Adjunto, 'mio' | 'autor'>): string {
  return adjunto.mio ? 'Tú' : (adjunto.autor.nombre ?? 'Alguien')
}

export function claseDelMime(mime: string): ClaseDeArchivo {
  return mime === MIME_DE_PDF ? 'pdf' : mime === MIME_DE_WORD ? 'docx' : 'imagen'
}
