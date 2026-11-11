// Lo que comparten las pruebas de contrato de la función `push` (supabase/functions/push).
// El código de la función corre en Deno y no entra al lint ni al typecheck (tsconfig y ESLint excluyen
// `supabase/functions`): se carga en Node por una ruta en variable, y los tipos de abajo son su contrato.
// Ningún pedido sale a la red: `fetch` es siempre un simulado. Las claves VAPID y las del suscriptor se
// generan acá; ninguna clave real se lee.
import { createECDH, randomBytes, type ECDH } from 'node:crypto'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { vi } from 'vitest'

const CARPETA = join(process.cwd(), 'supabase/functions/push')

export type Estado = 'enviada' | 'caducada' | 'fallo'
export type Claves = { p256dh: string; auth: string }
export type Suscripcion = { id: string; endpoint: string; claves: Claves }
export type Carga = { titulo: string; cuerpo: string | null; ruta: string | null }
export type ClavesVapid = { publica: string; sujeto: string; firma: CryptoKey }
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>

export type ModuloVapid = {
  importarClaves: (entrada: {
    publica: string
    privada: string
    sujeto: string
  }) => Promise<{ ok: true; claves: ClavesVapid } | { ok: false }>
}
export type ModuloCifrar = {
  cifrar: (
    texto: Uint8Array,
    claves: Claves,
    aleatorio?: { sal: Uint8Array; remitente: CryptoKeyPair },
  ) => Promise<Uint8Array | null>
}
export type ModuloEnviar = {
  enviarPush: (entrada: {
    suscripcion: Suscripcion
    carga: Carga
    claves: ClavesVapid
    fetch: Fetch
    ahora: number
  }) => Promise<Estado>
}

export async function cargar<T>(
  archivo: 'vapid.ts' | 'cifrar.ts' | 'enviar.ts' | 'index.ts',
): Promise<T> {
  const ruta = join(CARPETA, archivo)
  return (await import(/* @vite-ignore */ ruta)) as T
}

export function b64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url')
}

// Las claves VAPID en el formato de `web-push generate-vapid-keys`: la pública como punto sin comprimir
// (65 bytes) y la privada como los 32 bytes de `d`.
export async function clavesVapidDePrueba(): Promise<{
  publica: string
  privada: string
  sujeto: string
}> {
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])
  const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey))
  const jwk = await crypto.subtle.exportKey('jwk', par.privateKey)
  return { publica: b64url(publica), privada: jwk.d ?? '', sujeto: 'mailto:avisos@ejemplo.test' }
}

// Un navegador suscrito: su par ECDH (el `p256dh`) y su secreto `auth` de 16 bytes.
export function suscriptor(): { ecdh: ECDH; claves: Claves } {
  const ecdh = createECDH('prime256v1')
  ecdh.generateKeys()
  return { ecdh, claves: { p256dh: b64url(ecdh.getPublicKey()), auth: b64url(randomBytes(16)) } }
}

// Un par ECDH de Node llevado a Web Crypto, para fijar el remitente del cifrado.
export async function aWebCrypto(ecdh: ECDH): Promise<CryptoKeyPair> {
  const punto = ecdh.getPublicKey()
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: b64url(punto.subarray(1, 33)),
    y: b64url(punto.subarray(33, 65)),
  }
  const algoritmo = { name: 'ECDH', namedCurve: 'P-256' }
  return {
    privateKey: await crypto.subtle.importKey(
      'jwk',
      { ...jwk, d: b64url(ecdh.getPrivateKey()) },
      algoritmo,
      true,
      ['deriveBits'],
    ),
    publicKey: await crypto.subtle.importKey('jwk', jwk, algoritmo, true, []),
  }
}

type Ece = {
  encrypt: (texto: Buffer, opciones: Record<string, unknown>) => Buffer
  decrypt: (cifrado: Buffer, opciones: Record<string, unknown>) => Buffer
}

// El oráculo: `http_ece`, la implementación de RFC 8188/8291 que trae `web-push` (no se instala nada).
export const ece = createRequire(createRequire(import.meta.url).resolve('web-push'))(
  'http_ece',
) as Ece

export type Pedido = {
  url: string
  init: RequestInit | undefined
  cabeceras: Headers
  cuerpo: Uint8Array | null
}

// Un `fetch` simulado que guarda cada pedido y responde lo que diga `responder`.
export function fetchSimulado(responder: (url: string) => Response | Error): {
  fetch: Fetch
  pedidos: Pedido[]
} {
  const pedidos: Pedido[] = []
  const simulado: Fetch = (url, init) => {
    const cuerpo = init?.body instanceof Uint8Array ? init.body : null
    pedidos.push({ url, init, cabeceras: new Headers(init?.headers), cuerpo })
    const respuesta = responder(url)
    return respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve(respuesta)
  }
  return { fetch: simulado, pedidos }
}

// La función entera: un `Deno` mínimo (con las variables que arma cada prueba, porque las claves se leen por pedido)
// y un `fetch` simulado que hace de base (las dos RPC) y de servicios de push.
type Manejador = (pedido: Request) => Promise<Response>
export const VARIABLES_VAPID = [
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
] as const
export type VariableVapid = (typeof VARIABLES_VAPID)[number]
export const entorno: Record<VariableVapid, string | undefined> = {
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: undefined,
  VAPID_PRIVATE_KEY: undefined,
  VAPID_SUBJECT: undefined,
}
export const BASE_DE_PRUEBA = 'http://base.test'
export const SERVICIO = 'clave-de-servicio-de-prueba'
let manejador: Manejador | undefined

export async function cargarFuncion(): Promise<void> {
  vi.stubGlobal('Deno', {
    env: {
      get: (nombre: string) =>
        ({ SUPABASE_URL: BASE_DE_PRUEBA, SUPABASE_SERVICE_ROLE_KEY: SERVICIO, ...entorno })[nombre],
    },
    serve: (atender: Manejador) => {
      manejador = atender
    },
  })
  await cargar('index.ts')
}

export type Llamada = { url: string; cuerpo: unknown; autorizacion: string | null }

// `abierto` es lo que devuelve `push_abrir` (null = el pase no vale); `servicios`, el estado de cada endpoint.
export function simularBase(abierto: unknown, servicios: Record<string, number> = {}): Llamada[] {
  const llamadas: Llamada[] = []
  vi.stubGlobal('fetch', (entrada: string | URL, init?: RequestInit) => {
    const url = String(entrada)
    const cuerpo: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null
    llamadas.push({ url, cuerpo, autorizacion: new Headers(init?.headers).get('Authorization') })
    if (url === `${BASE_DE_PRUEBA}/rest/v1/rpc/push_abrir`) {
      return Promise.resolve(Response.json(abierto))
    }
    if (url === `${BASE_DE_PRUEBA}/rest/v1/rpc/push_resultado`) {
      return Promise.resolve(Response.json({ enviadas: 0, caducadas: 0, fallos: 0 }))
    }
    return Promise.resolve(new Response(null, { status: servicios[url] ?? 500 }))
  })
  return llamadas
}

export async function llamarFuncion(cuerpo: unknown): Promise<{ estado: number; json: unknown }> {
  if (!manejador) {
    throw new Error('la función no se cargó')
  }
  const respuesta = await manejador(
    new Request('http://funcion.test/', { method: 'POST', body: JSON.stringify(cuerpo) }),
  )
  return { estado: respuesta.status, json: await respuesta.json() }
}
