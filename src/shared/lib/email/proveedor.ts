import type { z } from 'zod'

import type { esquemaDelServidor } from '../../config/esquemas'
import { crearAdaptadorMailpit } from './adaptadores/mailpit'
import type { AdaptadorDeEmail, Remitente } from './tipos'

// Qué adaptador usa la configuración. Aparte de `index.ts` (que importa `server-only`) para que `pnpm email:probar`, que corre en
// Node, elija el adaptador exactamente como la app. Cambiar de proveedor es cambiar variables: este archivo es el único que los nombra.
export type EntornoDeEmail = Pick<
  z.infer<typeof esquemaDelServidor>,
  'EMAIL_PROVEEDOR' | 'EMAIL_REMITENTE' | 'EMAIL_REMITENTE_NOMBRE' | 'MAILPIT_URL'
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
  if (entorno.EMAIL_PROVEEDOR === 'mailpit' && entorno.MAILPIT_URL)
    return crearAdaptadorMailpit(entorno.MAILPIT_URL, pedir)
  return null
}
