// Cifrado del push web: RFC 8291 sobre aes128gcm (RFC 8188), con Web Crypto. Un solo registro, sin relleno.
// La prueba de contrato lo compara byte a byte con `http_ece` (supabase/tests/push-contrato.test.ts).
import { deb64url } from './vapid.ts'

export type ClavesDelNavegador = { p256dh: string; auth: string }

const TAMANO_DE_REGISTRO = 4096
const ECDH = { name: 'ECDH', namedCurve: 'P-256' }
const codificar = (texto: string) => new TextEncoder().encode(texto)

function unir(...partes: Uint8Array[]): Uint8Array {
  const total = new Uint8Array(partes.reduce((suma, parte) => suma + parte.length, 0))
  let desde = 0
  for (const parte of partes) {
    total.set(parte, desde)
    desde += parte.length
  }
  return total
}

// HKDF-SHA256 (extract y expand juntos), `bytes` de largo.
async function hkdf(
  sal: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  bytes: number,
): Promise<Uint8Array> {
  const clave = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: sal, info },
    clave,
    bytes * 8,
  )
  return new Uint8Array(bits)
}

// Devuelve el cuerpo `sal(16) ‖ rs(4) ‖ 65 ‖ as_public(65) ‖ cifrado`, o `null` si las claves del navegador
// no tienen el largo del protocolo (la base no mide bytes). `aleatorio` existe sólo para la prueba.
export async function cifrar(
  texto: Uint8Array,
  claves: ClavesDelNavegador,
  aleatorio?: { sal: Uint8Array; remitente: CryptoKeyPair },
): Promise<Uint8Array | null> {
  const uaPublica = deb64url(claves.p256dh)
  const auth = deb64url(claves.auth)
  if (uaPublica?.length !== 65 || uaPublica[0] !== 0x04 || auth?.length !== 16) {
    return null
  }
  try {
    const ua = await crypto.subtle.importKey('raw', uaPublica, ECDH, false, [])
    const remitente =
      aleatorio?.remitente ??
      ((await crypto.subtle.generateKey(ECDH, true, ['deriveBits'])) as CryptoKeyPair)
    const asPublica = new Uint8Array(await crypto.subtle.exportKey('raw', remitente.publicKey))
    const secreto = new Uint8Array(
      await crypto.subtle.deriveBits({ name: 'ECDH', public: ua }, remitente.privateKey, 256),
    )
    const ikm = await hkdf(
      auth,
      secreto,
      unir(codificar('WebPush: info\0'), uaPublica, asPublica),
      32,
    )
    const sal = aleatorio?.sal ?? crypto.getRandomValues(new Uint8Array(16))
    const cek = await hkdf(sal, ikm, codificar('Content-Encoding: aes128gcm\0'), 16)
    const nonce = await hkdf(sal, ikm, codificar('Content-Encoding: nonce\0'), 12)
    const clave = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
    // El delimitador 0x02 marca el último (y único) registro.
    const cifrado = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      clave,
      unir(texto, new Uint8Array([0x02])),
    )
    const encabezado = new Uint8Array(21)
    encabezado.set(sal, 0)
    new DataView(encabezado.buffer).setUint32(16, TAMANO_DE_REGISTRO)
    encabezado[20] = asPublica.length
    return unir(encabezado, asPublica, new Uint8Array(cifrado))
  } catch {
    return null
  }
}
