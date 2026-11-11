// Firma VAPID (RFC 8292) con Web Crypto: sin `Deno.*`, `npm:` ni `Buffer`, para que la prueba de contrato
// (supabase/tests/push-contrato.test.ts) lo cargue en Node tal cual corre en el runtime.

export type ClavesVapid = { publica: string; sujeto: string; firma: CryptoKey }

const BASE64URL = /^[A-Za-z0-9_-]*={0,2}$/
const DOCE_HORAS = 12 * 3600

export function b64url(bytes: Uint8Array): string {
  let binario = ''
  for (const byte of bytes) {
    binario += String.fromCharCode(byte)
  }
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function deb64url(texto: string): Uint8Array | null {
  if (!BASE64URL.test(texto)) {
    return null
  }
  const limpio = texto.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/')
  try {
    const binario = atob(limpio + '='.repeat((4 - (limpio.length % 4)) % 4))
    return Uint8Array.from(binario, (letra) => letra.charCodeAt(0))
  } catch {
    return null
  }
}

// La pública es el punto sin comprimir (65 bytes, empieza en 0x04) y la privada los 32 bytes de `d`: el
// formato de `web-push generate-vapid-keys`.
export async function importarClaves(entrada: {
  publica: string
  privada: string
  sujeto: string
}): Promise<{ ok: true; claves: ClavesVapid } | { ok: false }> {
  const punto = deb64url(entrada.publica)
  const d = deb64url(entrada.privada)
  const sujetoValido = entrada.sujeto.startsWith('mailto:') || entrada.sujeto.startsWith('https://')
  if (punto?.length !== 65 || punto[0] !== 0x04 || d?.length !== 32 || !sujetoValido) {
    return { ok: false }
  }
  try {
    const firma = await crypto.subtle.importKey(
      'jwk',
      {
        kty: 'EC',
        crv: 'P-256',
        d: b64url(d),
        x: b64url(punto.subarray(1, 33)),
        y: b64url(punto.subarray(33, 65)),
      },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    )
    return { ok: true, claves: { publica: b64url(punto), sujeto: entrada.sujeto, firma } }
  } catch {
    return { ok: false }
  }
}

const texto = (valor: unknown) => b64url(new TextEncoder().encode(JSON.stringify(valor)))

// `Authorization: vapid t=<jwt>, k=<pública>`. Web Crypto firma ECDSA en `r‖s` (64 bytes), que es el
// formato de JWS: no se pasa a DER. `exp` a 12 h, debajo del máximo de 24 h.
export async function cabeceraVapid(
  endpoint: string,
  claves: ClavesVapid,
  ahora: number,
): Promise<string> {
  const firmado = `${texto({ typ: 'JWT', alg: 'ES256' })}.${texto({
    aud: new URL(endpoint).origin,
    exp: Math.floor(ahora / 1000) + DOCE_HORAS,
    sub: claves.sujeto,
  })}`
  const firma = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    claves.firma,
    new TextEncoder().encode(firmado),
  )
  return `vapid t=${firmado}.${b64url(new Uint8Array(firma))}, k=${claves.publica}`
}
