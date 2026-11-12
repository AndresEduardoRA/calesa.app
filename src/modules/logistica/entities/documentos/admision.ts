import type { TipoDeDocumento } from './documento'
import { formatearBytes } from './tamano'

// Qué archivo entra a la bandeja de «Subir documentos» y qué pide cada tipo al subir (6.06-2). Pura: sin I/O. La base vuelve a validarlo todo (`documento_registrar`); esto sólo evita
// subir un objeto que se sabe que no va a registrarse. Los formatos salen del tipo (de la base), nunca de un texto fijo; sólo las extensiones con que se guarda el objeto son de aquí.

/** El tope de la base por archivo: 25 MB. */
export const PESO_MAXIMO_DEL_DOCUMENTO = 26_214_400
/** Desde este peso se avisa antes de subir (D1: una foto de la cámara no se comprime). */
export const PESO_QUE_AVISA = 10 * 1024 * 1024
/** Cuántos archivos caben en la bandeja por vez. */
export const TOPE_DE_LA_BANDEJA = 20
/** La nota de un documento: el tope de la base. */
export const TOPE_DE_LA_NOTA = 2000

// `pdf|jpg|png|webp`: la extensión con que se guarda cada tipo de contenido en el bucket (`<unidad>/<sha-256>.<ext>`: de 1 a 5 letras o números).
const EXTENSIONES: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const NOMBRES_DE_FORMATO: Readonly<Record<string, string>> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
}

/** La extensión con que se guarda según el tipo de contenido; nula si el bucket no lo admite. */
export function extensionDelDocumento(mime: string): string | null {
  return EXTENSIONES[mime] ?? null
}

/** El formato dicho para una persona: «PDF», «JPG»; el que no se conoce, tal cual lo trae el archivo. */
export function nombreDelFormato(mime: string): string {
  return NOMBRES_DE_FORMATO[mime] ?? (mime === '' ? 'ese formato' : mime)
}

/** «PDF, JPG y PNG» para decir qué admite un tipo. */
export function formatosLegibles(formatos: readonly string[]): string {
  const nombres = formatos.map(nombreDelFormato)
  if (nombres.length <= 1) {
    return nombres.join('')
  }
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1] ?? ''}`
}

/** El `accept` del selector: lo que admite el tipo elegido o, sin tipo, todo lo que el bucket guarda. Lo que se suelta encima no pasa por ahí: lo valida `veredictoDelArchivo`. */
export function aceptarDelTipo(tipo: Pick<TipoDeDocumento, 'formatos'> | null): string {
  const formatos = tipo ? tipo.formatos : Object.keys(EXTENSIONES)
  return formatos.join(',')
}

export type ArchivoElegido = { nombre: string; mime: string; bytes: number; hash: string }

export type Veredicto = { entra: true } | { entra: false; motivo: string }

/**
 * ¿Entra este archivo a la bandeja? Vacío, de más de 25 MB, de un formato que el tipo no admite (sin tipo elegido: uno que el bucket no guarda) o repetido (mismo hash que uno que ya
 * está). El primer motivo que aplica es el que se dice.
 */
export function veredictoDelArchivo(
  archivo: ArchivoElegido,
  tipo: Pick<TipoDeDocumento, 'formatos'> | null,
  hashesEnLaBandeja: ReadonlySet<string>,
): Veredicto {
  if (archivo.bytes <= 0) {
    return { entra: false, motivo: 'Está vacío.' }
  }
  if (archivo.bytes > PESO_MAXIMO_DEL_DOCUMENTO) {
    return { entra: false, motivo: 'Pesa más de 25 MB.' }
  }
  const admitido = tipo
    ? tipo.formatos.includes(archivo.mime)
    : extensionDelDocumento(archivo.mime) !== null
  if (!admitido) {
    return {
      entra: false,
      motivo: tipo
        ? `Este tipo de documento no admite ${nombreDelFormato(archivo.mime)}.`
        : `${nombreDelFormato(archivo.mime)} no se admite como documento.`,
    }
  }
  if (hashesEnLaBandeja.has(archivo.hash)) {
    return { entra: false, motivo: 'Ya está en la lista.' }
  }
  return { entra: true }
}

/** El aviso de un archivo pesado, o nulo si no pasa de 10 MB: «Pesa 12,4 MB: en una red lenta tarda.» */
export function avisoDelPeso(bytes: number): string | null {
  return bytes > PESO_QUE_AVISA ? `Pesa ${formatearBytes(bytes)}: en una red lenta tarda.` : null
}

export type CamposDeFechas = {
  // «Emitido el» se pregunta salvo en un tipo que no vence.
  emitido: boolean
  vence: 'oculto' | 'opcional' | 'obligatorio'
}

/** Qué fechas pide el tipo, según su modo: `ninguno` no lleva (la base rechaza una fecha), `renovar` la calcula si no se escribe y `solicitar` la exige. */
export function camposDeFechasDelTipo(
  tipo: Pick<TipoDeDocumento, 'modoDeVencimiento'> | null,
): CamposDeFechas {
  switch (tipo?.modoDeVencimiento ?? 'ninguno') {
    case 'solicitar':
      return { emitido: true, vence: 'obligatorio' }
    case 'renovar':
      return { emitido: true, vence: 'opcional' }
    case 'ninguno':
      return { emitido: false, vence: 'oculto' }
  }
}

export type DatosDeLaBandeja = {
  tipo: TipoDeDocumento | null
  cantidad: number
  emitidoEl: string
  venceEl: string
  nota: string
}

const DIA = /^\d{4}-\d{2}-\d{2}$/

function errorDelVencimiento(vence: string, emitido: string, exige: boolean): string | null {
  if (vence === '') {
    return exige ? 'Este tipo de documento pide la fecha de vencimiento.' : null
  }
  if (!DIA.test(vence)) {
    return 'Escribe una fecha válida.'
  }
  return emitido !== '' && DIA.test(emitido) && vence < emitido
    ? 'El vencimiento no puede ser antes de la emisión.'
    : null
}

/** Lo que falta o sobra antes de subir, por campo (`tipo`, `archivos`, `emitidoEl`, `venceEl`, `nota`); vacío, se puede subir. */
export function erroresDeLaBandeja(datos: DatosDeLaBandeja): Record<string, string> {
  const errores: Record<string, string> = {}
  const fechas = camposDeFechasDelTipo(datos.tipo)
  const emitido = fechas.emitido ? datos.emitidoEl : ''
  const vence = fechas.vence === 'oculto' ? '' : datos.venceEl
  const encontrados: Record<string, string | null> = {
    tipo: datos.tipo === null ? 'Elige el tipo de documento.' : null,
    archivos: datos.cantidad === 0 ? 'Elige al menos un archivo.' : null,
    emitidoEl: emitido !== '' && !DIA.test(emitido) ? 'Escribe una fecha válida.' : null,
    venceEl: errorDelVencimiento(vence, emitido, fechas.vence === 'obligatorio'),
    nota:
      datos.nota.trim().length > TOPE_DE_LA_NOTA
        ? `La nota admite hasta ${TOPE_DE_LA_NOTA} caracteres.`
        : null,
  }
  for (const [campo, motivo] of Object.entries(encontrados)) {
    if (motivo !== null) {
      errores[campo] = motivo
    }
  }
  return errores
}
