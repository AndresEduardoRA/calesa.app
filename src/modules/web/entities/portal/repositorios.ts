// Las interfaces del área `portal` de `web` (8.07): lo que la composición le da a los route handlers de `app/api/portal/*`. El portal
// no tiene sesión de Supabase: la puerta es la cookie firmada y, en la base, `_portal_vigente` (que compara `otorgado_en`).
import type { Resultado } from '@/shared/lib/errores'
import type { SesionDelPortal } from './sesion'

// `true` = puede seguir; `false` = pasó el límite por IP (429). La IP llega cruda: la implementación la agrupa (`agruparIp`).
export type ContadorDeIntentosDelPortal = (ipCruda: string | null) => Promise<Resultado<boolean>>

export type IngresoDelPortal = {
  sesion: SesionDelPortal
  nombre: string
  debe_cambiar_clave: boolean
}

// `null` = código o clave que no valen, acceso deshabilitado o bloqueado: un solo 401, sin decir cuál.
export type IngresoAlPortal = (
  codigo: string,
  clave: string,
) => Promise<Resultado<IngresoDelPortal | null>>

// El snapshot del cliente tal cual lo arma `portal_snapshot`; `null` = la sesión ya no vale (401).
export type LectorDeEstadoDelPortal = (sesion: SesionDelPortal) => Promise<Resultado<unknown>>

// Una URL firmada de 60 s del documento; `null` = no existe, no es del cliente o no es visible en el portal (404). La ruta de storage
// nunca sale de la implementación.
export type UrlDeDocumentoDelPortal = (
  sesion: SesionDelPortal,
  documentoId: string,
) => Promise<Resultado<string | null>>

// `true` = cambiada; `false` = la clave actual no vale o la sesión ya no vale. Una clave nueva que no cumple llega como `regla`.
export type CambioDeClaveDelPortal = (
  sesion: SesionDelPortal,
  actual: string,
  nueva: string,
) => Promise<Resultado<boolean>>

// La dirección pública del sitio (para el `Origin` permitido), o nula si nadie la cargó.
export type LectorDeDireccionDelSitioParaElPortal = () => Promise<Resultado<string | null>>

// Con el secreto ya atado por la composición: si el despliegue no lo tiene, `portalDisponible()` da `false` (503).
export type FirmaDeSesionDelPortal = (sesion: SesionDelPortal, ahora: Date) => string
export type LecturaDeSesionDelPortal = (
  valor: string | null | undefined,
  ahora: Date,
) => SesionDelPortal | null
