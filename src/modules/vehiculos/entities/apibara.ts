// Lo que el alta y el refresco saben de apibara sin tocar la red: cómo se lee lo que la persona
// pega, qué códigos de error existen y cómo se dicen. La llamada vive en la edge function
// `apibara` (supabase/functions/apibara) y la hace el navegador con su sesión.
import { PLATAFORMAS_APIBARA, type PlataformaApibara } from '@/shared/lib/apibara'

// Hasta cuántas líneas se aceptan de una vez: cada una es una consulta a la API.
export const MAXIMO_DE_LINEAS = 20

// --- Lo que se pega ------------------------------------------------------------------------------

export type EntradaDeApibara =
  | { tipo: 'enlace'; valor: string; plataforma: PlataformaApibara }
  | { tipo: 'vin'; valor: string }
  | { tipo: 'lote'; valor: string }

export type LineaInterpretada =
  | { ok: true; texto: string; entrada: EntradaDeApibara }
  | { ok: false; texto: string; motivo: string }

const PATRON_DE_VIN = /^[A-HJ-NPR-Z0-9]{17}$/
// El lote de Copart tiene 8 dígitos y el de IAAI (su stock) 8 o 12 con el prefijo 1110.
const PATRON_DE_LOTE = /^\d{5,12}$/

function plataformaDeEnlace(texto: string): PlataformaApibara | null {
  let direccion: URL
  try {
    direccion = new URL(texto)
  } catch {
    return null
  }
  if (direccion.protocol !== 'https:' && direccion.protocol !== 'http:') {
    return null
  }
  const host = direccion.hostname.toLowerCase()
  for (const plataforma of PLATAFORMAS_APIBARA) {
    if (host === `${plataforma}.com` || host.endsWith(`.${plataforma}.com`)) {
      return plataforma
    }
  }
  return null
}

// Una línea: un enlace de Copart o IAAI, un VIN de 17 o un número de lote. Lo demás se dice con su
// motivo, sin llamar a nadie.
export function interpretarLinea(linea: string): LineaInterpretada {
  const texto = linea.trim()
  if (/^https?:\/\//i.test(texto)) {
    const plataforma = plataformaDeEnlace(texto)
    return plataforma
      ? { ok: true, texto, entrada: { tipo: 'enlace', valor: texto, plataforma } }
      : { ok: false, texto, motivo: 'Ese enlace no es de Copart ni de IAAI.' }
  }
  const vin = texto.toUpperCase()
  if (PATRON_DE_VIN.test(vin)) {
    return { ok: true, texto, entrada: { tipo: 'vin', valor: vin } }
  }
  if (PATRON_DE_LOTE.test(texto)) {
    return { ok: true, texto, entrada: { tipo: 'lote', valor: texto } }
  }
  return {
    ok: false,
    texto,
    motivo: 'Pega un enlace de Copart o IAAI, un VIN de 17 caracteres o un número de lote.',
  }
}

// Las líneas de lo pegado, sin vacías ni repetidas, en el orden en que llegaron.
export function lineasDe(texto: string): string[] {
  const vistas = new Set<string>()
  const lineas: string[] = []
  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda.trim()
    if (linea !== '' && !vistas.has(linea)) {
      vistas.add(linea)
      lineas.push(linea)
    }
  }
  return lineas
}

// --- Lo que responde la edge function --------------------------------------------------------------

export type CodigoDeApibara =
  | 'apagada'
  | 'sin_permiso'
  | 'entrada'
  | 'plataforma'
  | 'no_soportado'
  | 'no_encontrado'
  | 'clave_invalida'
  | 'cuota'
  | 'tiempo'
  | 'proveedor'
  | 'red'

export const CODIGOS_DE_APIBARA: readonly CodigoDeApibara[] = [
  'apagada',
  'sin_permiso',
  'entrada',
  'plataforma',
  'no_soportado',
  'no_encontrado',
  'clave_invalida',
  'cuota',
  'tiempo',
  'proveedor',
  'red',
]

export function esCodigoDeApibara(valor: unknown): valor is CodigoDeApibara {
  return typeof valor === 'string' && (CODIGOS_DE_APIBARA as readonly string[]).includes(valor)
}

const MENSAJES: Record<CodigoDeApibara, string> = {
  apagada: 'apibara está apagada en este origen. Puedes cargar el vehículo a mano.',
  sin_permiso: 'No tienes permiso para consultar apibara en este origen.',
  entrada: 'Pega un enlace de Copart o IAAI, un VIN de 17 caracteres o un número de lote.',
  plataforma: 'Este origen no consulta esa plataforma.',
  no_soportado: 'apibara no pudo leer ese dato. Revisa el enlace, el VIN o el lote.',
  no_encontrado: 'apibara no tiene ese vehículo. Revisa el dato o cárgalo a mano.',
  clave_invalida: 'apibara rechazó la clave guardada. Puedes seguir a mano.',
  cuota: 'Se agotó la cuota de consultas de apibara de este período. Puedes seguir a mano.',
  tiempo: 'apibara tardó demasiado en responder. Vuelve a intentar o sigue a mano.',
  proveedor: 'apibara tuvo un problema. Vuelve a intentar en un momento o sigue a mano.',
  red: 'No se pudo llegar a apibara. Revisa tu conexión y vuelve a intentar.',
}

export function mensajeDeApibara(codigo: CodigoDeApibara): string {
  return MENSAJES[codigo]
}

// Con estos códigos tiene sentido llevar a Configuración › Integraciones (quien puede gestionarlas).
export function pideRevisarIntegracion(codigo: CodigoDeApibara): boolean {
  return codigo === 'clave_invalida' || codigo === 'cuota' || codigo === 'apagada'
}

// Reintentar sirve cuando el fallo es del momento; con la cuota agotada o un dato que no existe,
// sólo gastaría otra consulta.
export function sePuedeReintentar(codigo: CodigoDeApibara): boolean {
  return codigo === 'tiempo' || codigo === 'proveedor' || codigo === 'red'
}

// La ficha tal como la devuelve apibara: `data` es la respuesta en bruto (lo que se guarda).
export type FichaDeApibara = {
  data: Record<string, unknown>
  // La dirección que consultó la API, si la entrada fue un enlace.
  url: string | null
}

export type ResultadoDeApibara<T> =
  { ok: true; data: T } | { ok: false; error: { codigo: CodigoDeApibara; mensaje: string } }

export function falloDeApibara(codigo: CodigoDeApibara): ResultadoDeApibara<never> {
  return { ok: false, error: { codigo, mensaje: mensajeDeApibara(codigo) } }
}

// Lo único que la edge function descarga como foto: las dos plataformas. Si la lista fuera libre,
// nuestra clave serviría de proxy a cualquier sitio. La edge function repite esta lista
// (`supabase/functions/apibara/index.ts`); un test las compara.
export const HOSTS_DE_FOTO: readonly string[] = ['cs.copart.com', 'vis.iaai.com']

export function esFotoPermitida(direccion: string): boolean {
  try {
    const url = new URL(direccion)
    return url.protocol === 'https:' && HOSTS_DE_FOTO.includes(url.hostname.toLowerCase())
  } catch {
    return false
  }
}
