// Las interfaces del acceso del cliente: lo que `features/portal` pide y `composicion.ts` le da. Todas
// son clase 1 (la cartera del lead y `leads.portal.gestionar`); lo que no se ve responde igual que lo
// que no existe.
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { AccesoDelCliente, AccesoOtorgado } from './portal'

// Un rechazo con el campo del formulario que lo causó (`clave`), si lo hay.
export type FalloDelPortal = { ok: false; error: ErrorApp; campo?: string }

type RespuestaDelPortal<T> = Promise<{ ok: true; data: T } | FalloDelPortal>

export type LectorDeAccesoDelCliente = (leadId: string) => Promise<Resultado<AccesoDelCliente>>

export type RepositorioDelPortal = {
  // `clave` nula: la genera la base y vuelve una sola vez. `otorgadoEnEsperado`: la versión que se ve
  // (nula si no hay acceso); otra es un conflicto que dice quién lo otorgó.
  otorgar: (pedido: {
    leadId: string
    clave: string | null
    otorgadoEnEsperado: string | null
  }) => RespuestaDelPortal<AccesoOtorgado>
  // Inmediato e idempotente.
  revocar: (leadId: string) => RespuestaDelPortal<null>
  // Limpia el bloqueo y los intentos. Idempotente.
  desbloquear: (leadId: string) => RespuestaDelPortal<null>
}
