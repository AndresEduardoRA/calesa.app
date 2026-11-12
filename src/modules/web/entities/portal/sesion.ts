// La sesión del portal del cliente (8.07): lo que viaja en su cookie firmada y cómo se pone. Sin I/O.
import { z } from 'zod'

// `otorgado_en` es el texto que da la base (`portal_login`), con microsegundos y offset: viaja tal cual, nunca por `Date`, porque
// `_portal_vigente` lo compara por igualdad y un `Date` perdería los microsegundos.
export type SesionDelPortal = { lead_id: string; otorgado_en: string }

// Una sola forma de validarlo: la usan la cookie al leer y las RPC al recibirlo de la base.
export const otorgadoEnDelPortal = z.iso.datetime({ offset: true })

export const COOKIE_DEL_PORTAL = 'portal'

export const DURACION_DE_LA_SESION_S = 604_800 // 7 días

// `maxAge: 0` la borra. `path` la acota a la API del portal: el resto de la app nunca la recibe.
export function opcionesDeLaCookieDelPortal(maxAge: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/portal',
    maxAge,
  } as const
}
