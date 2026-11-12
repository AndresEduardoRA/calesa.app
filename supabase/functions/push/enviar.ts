// El envío de un push a una suscripción: valida otra vez el host, cifra, firma, manda y clasifica.
// Puro: `fetch`, `ahora` y las claves vienen de afuera (supabase/tests/push-contrato.test.ts).
import { cifrar, type ClavesDelNavegador } from './cifrar.ts'
import { cabeceraVapid, type ClavesVapid } from './vapid.ts'

export type Estado = 'enviada' | 'caducada' | 'fallo'
export type Suscripcion = { id: string; endpoint: string; claves: ClavesDelNavegador }
export type Carga = { titulo: string; cuerpo: string | null; ruta: string | null }
type Fetch = (url: string, init?: RequestInit) => Promise<Response>

// La misma lista que `public._push_host_permitido()` (supabase/migrations/*_push_suscribir.sql), copiada a propósito:
// es la segunda defensa para que la función no sea un proxy abierto (D22 de la 7.03-2).
const HOSTS = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
]
const SUFIJOS = ['.push.services.mozilla.com', '.notify.windows.com', '.push.apple.com']
const PROHIBIDOS = /[\\\s\x00-\x1f\x7f]/
const MAXIMO_DE_CARGA = 3000
const TTL = '86400'
const ESPERA_MS = 10_000

export function endpointPermitido(endpoint: string): boolean {
  if (endpoint.length > 2048 || PROHIBIDOS.test(endpoint)) {
    return false
  }
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.port !== '' || url.username !== '' || url.password !== '') {
    return false
  }
  return HOSTS.includes(url.hostname) || SUFIJOS.some((sufijo) => url.hostname.endsWith(sufijo))
}

// `{ titulo, cuerpo, ruta }` en UTF-8, ≤ 3000 bytes (recorta el cuerpo); la ruta sólo si es interna.
export function armarCarga(fila: { titulo: unknown; cuerpo: unknown; ruta: unknown }): Uint8Array {
  const ruta =
    typeof fila.ruta === 'string' && fila.ruta.startsWith('/') && !fila.ruta.startsWith('//')
      ? fila.ruta
      : null
  const titulo = typeof fila.titulo === 'string' ? fila.titulo : ''
  let letras = typeof fila.cuerpo === 'string' ? Array.from(fila.cuerpo) : null
  const codificar = (cuerpo: string | null) =>
    new TextEncoder().encode(JSON.stringify({ titulo, cuerpo, ruta }))
  let carga = codificar(letras?.join('') ?? null)
  while (carga.length > MAXIMO_DE_CARGA && letras && letras.length > 0) {
    letras = letras.slice(
      0,
      Math.max(0, letras.length - Math.ceil((carga.length - MAXIMO_DE_CARGA) / 4) - 1),
    )
    carga = codificar(`${letras.join('')}…`)
  }
  return carga
}

function clasificar(estado: number): Estado {
  if (estado >= 200 && estado < 300) {
    return 'enviada'
  }
  // Sólo 404 y 410 dicen que la suscripción ya no existe; un 403 (otra clave VAPID) o un 3xx no borran (D18).
  return estado === 404 || estado === 410 ? 'caducada' : 'fallo'
}

export async function enviarPush(entrada: {
  suscripcion: Suscripcion
  carga: Carga | Uint8Array
  claves: ClavesVapid
  fetch: Fetch
  ahora: number
}): Promise<Estado> {
  const { suscripcion, claves, ahora } = entrada
  if (!endpointPermitido(suscripcion.endpoint)) {
    return 'fallo'
  }
  try {
    const carga = entrada.carga instanceof Uint8Array ? entrada.carga : armarCarga(entrada.carga)
    const cuerpo = await cifrar(carga, suscripcion.claves)
    if (!cuerpo) {
      return 'fallo'
    }
    const respuesta = await entrada.fetch(suscripcion.endpoint, {
      method: 'POST',
      // Un 3xx no se sigue: reenviaría el cuerpo a un host que no pasó por la lista.
      redirect: 'manual',
      signal: AbortSignal.timeout(ESPERA_MS),
      headers: {
        Authorization: await cabeceraVapid(suscripcion.endpoint, claves, ahora),
        TTL,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
      },
      body: cuerpo,
    })
    await respuesta.body?.cancel()
    return clasificar(respuesta.status)
  } catch {
    return 'fallo'
  }
}
