import 'server-only'
import { headers } from 'next/headers'

// La dirección pública de este sitio en este request (`https://app.empresa.com`). Hace falta para
// decirle a Auth a dónde volver después de Google; Auth sólo acepta las que tiene en su lista.
export async function origenDelSitio(): Promise<string> {
  const cabeceras = await headers()
  const origen = cabeceras.get('origin')
  if (origen && URL.canParse(origen)) {
    return origen
  }
  const host = cabeceras.get('x-forwarded-host') ?? cabeceras.get('host') ?? 'localhost:3000'
  const protocolo =
    cabeceras.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${protocolo}://${host}`
}
