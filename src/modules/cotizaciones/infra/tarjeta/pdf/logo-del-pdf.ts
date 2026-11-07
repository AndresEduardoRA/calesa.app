import 'server-only'
import type { ModeloDeTarjeta } from '../../../entities/tarjeta/modelo-de-la-tarjeta'

// El logo del PDF (4.18-3a, C14, P2). Se baja aquí, en el servidor, con tope de bytes y de tiempo, y llega a react-pdf como `Buffer`, nunca como URL (react-pdf la bajaría sin
// espera ni tope y la guardaría en su caché de proceso). Va según sus primeros bytes: PNG y JPEG siempre; un SVG sólo si react-pdf (`@react-pdf/svg` 1.1.1) lo dibuja fiel, sin
// lo que se salta (`<style>` y las clases, `use`, `symbol`, `mask`, `filter`, `pattern`) ni `<image>`, que bajaría o leería otro archivo sin tope ni espera. El WebP no lo dibuja.
// Un logo que no va, que tarda o que pesa de más deja el PDF sin logo y lo dice por consola, sin la URL; nunca rompe el PDF.
export type LogoDelPdf = { datos: Buffer; tipo: 'png' | 'jpg' | 'svg' }

type Entrada = {
  // El logo que pide el modelo: nulo si la plantilla no lo lleva o la empresa no tiene uno (entonces no se baja nada).
  logo: ModeloDeTarjeta['logo']
  tope: number
  esperaMs?: number
  // Para las pruebas: una señal propia en vez de la espera.
  signal?: AbortSignal
}

const ESPERA_MS = 2000
const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const SVG_INFIEL = /<style\b|\sclass\s*=|<use\b|<symbol\b|<mask\b|<filter\b|<pattern\b|<image\b/i

function tipoDe(datos: Buffer): LogoDelPdf['tipo'] | 'svg_infiel' | null {
  if (datos.subarray(0, FIRMA_PNG.length).equals(FIRMA_PNG)) {
    return 'png'
  }
  if (datos[0] === 0xff && datos[1] === 0xd8 && datos[2] === 0xff) {
    return 'jpg'
  }
  // react-pdf reconoce un SVG sólo si empieza así, sin espacios antes.
  const texto = datos.toString('utf8')
  if (!/^(<\?xml|<svg)/.test(texto)) {
    return null
  }
  return SVG_INFIEL.test(texto) ? 'svg_infiel' : 'svg'
}

// El cuerpo, hasta el tope: un `content-length` mayor o pasarse al leer dejan de leer. Lo que no es un logo es un motivo, no un error.
async function bajar(url: string, tope: number, signal: AbortSignal): Promise<Buffer | string> {
  const respuesta = await fetch(url, { signal, cache: 'no-store' })
  if (!respuesta.ok || respuesta.body === null) {
    return `la respuesta fue ${String(respuesta.status)}`
  }
  if (Number(respuesta.headers.get('content-length') ?? 0) > tope) {
    return 'pesa más que el tope'
  }
  const trozos: Uint8Array[] = []
  let leidos = 0
  const lector = respuesta.body.getReader()
  for (let r = await lector.read(); !r.done; r = await lector.read()) {
    leidos += r.value.byteLength
    if (leidos > tope) {
      await lector.cancel()
      return 'pesa más que el tope'
    }
    trozos.push(r.value)
  }
  return Buffer.concat(trozos)
}

const MOTIVOS = {
  svg_infiel: 'un SVG con estilos, clases o partes que el PDF no dibuja fiel',
  desconocido: 'un formato que el PDF no dibuja (WebP u otro)',
} as const

export async function logoDelPdf({
  logo,
  tope,
  esperaMs = ESPERA_MS,
  signal,
}: Entrada): Promise<LogoDelPdf | null> {
  if (logo === null) {
    return null
  }
  const bajado = await bajar(logo.url, tope, signal ?? AbortSignal.timeout(esperaMs)).catch(
    () => 'no se pudo bajar a tiempo',
  )
  const tipo = typeof bajado === 'string' ? null : tipoDe(bajado)
  if (typeof bajado !== 'string' && (tipo === 'png' || tipo === 'jpg' || tipo === 'svg')) {
    return { datos: bajado, tipo }
  }
  const motivo =
    typeof bajado === 'string'
      ? bajado
      : MOTIVOS[tipo === 'svg_infiel' ? 'svg_infiel' : 'desconocido']
  console.warn(`[pdf] La cotización sale sin logo: ${motivo}.`)
  return null
}
