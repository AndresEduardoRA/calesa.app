import type { z } from 'zod'

import type { esquemaDelServidor } from '../../config/esquemas'
import { crearAdaptadorCloudflare } from './adaptadores/cloudflare'
import { crearAdaptadorMailpit } from './adaptadores/mailpit'
import { crearAdaptadorResend } from './adaptadores/resend-rest'
import type { AdaptadorDeEmail, Remitente } from './tipos'

// Qué adaptador usa la configuración. Aparte de `index.ts` (que importa `server-only`) para que `pnpm email:probar`, que corre en
// Node, elija el adaptador exactamente como la app. Cambiar de proveedor es cambiar variables: este archivo es el único que los nombra.
export type EntornoDeEmail = Pick<
  z.infer<typeof esquemaDelServidor>,
  | 'EMAIL_PROVEEDOR'
  | 'EMAIL_REMITENTE'
  | 'EMAIL_REMITENTE_NOMBRE'
  | 'MAILPIT_URL'
  | 'RESEND_API_KEY'
  | 'CLOUDFLARE_ACCOUNT_ID'
  | 'CLOUDFLARE_API_TOKEN'
>

// El esquema del entorno ya exige el remitente cuando hay un proveedor.
export const remitenteDe = (entorno: EntornoDeEmail): Remitente => ({
  email: entorno.EMAIL_REMITENTE ?? '',
  nombre: entorno.EMAIL_REMITENTE_NOMBRE ?? '',
})

// `null` si el correo está apagado o si falta la clave del proveedor elegido.
export function adaptadorDe(
  entorno: EntornoDeEmail,
  pedir?: typeof fetch,
): AdaptadorDeEmail | null {
  const {
    EMAIL_PROVEEDOR,
    MAILPIT_URL,
    RESEND_API_KEY,
    CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN,
  } = entorno
  if (EMAIL_PROVEEDOR === 'mailpit' && MAILPIT_URL) return crearAdaptadorMailpit(MAILPIT_URL, pedir)
  if (EMAIL_PROVEEDOR === 'resend' && RESEND_API_KEY)
    return crearAdaptadorResend(RESEND_API_KEY, pedir)
  if (EMAIL_PROVEEDOR === 'cloudflare' && CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_API_TOKEN)
    return crearAdaptadorCloudflare(CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, pedir)
  return null
}
