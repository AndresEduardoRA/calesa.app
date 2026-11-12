// La clave pública VAPID (P-256, 65 bytes sin comprimir, base64url) → los bytes que pide `pushManager.subscribe`.
export const LARGO_DE_CLAVE_PUBLICA = 65

const BASE64URL = /^[A-Za-z0-9_-]+$/

export function bytesDeClavePublica(clave: string): Uint8Array<ArrayBuffer> | null {
  if (!BASE64URL.test(clave)) return null
  const base64 = clave.replace(/-/g, '+').replace(/_/g, '/')
  const relleno = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  let binario: string
  try {
    binario = atob(relleno)
  } catch {
    return null
  }
  if (binario.length !== LARGO_DE_CLAVE_PUBLICA) return null
  const bytes = new Uint8Array(new ArrayBuffer(binario.length))
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
  return bytes
}
