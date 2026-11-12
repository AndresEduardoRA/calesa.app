import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest, type ErrorPostgrest } from '@/shared/lib/errores'
import { porCampoDe } from '../../entities/transporte/transporte'

// Lo que comparte la escritura de transporte por RPC (6.08-2). Cada área lleva lo suyo: un área no importa otra (`scripts/guardas/areas-de-logistica.test.ts`).
export const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

// `transporte_guardar` no admite nulo en sus tipos generados; la base sí (una versión nula es «crear», un repuesto nulo es «de vehículo»).
export function nuloParaLaBase(valor: string | null): string {
  return valor as string
}

type ErrorConPista = ErrorPostgrest & { hint?: string | null }

// Lo que la base rechaza vuelve con su mensaje ya escrito (6.07-1); el `hint` nombra el campo del formulario (naviera, puertos, contenedor, fechas…). Sin campo (p. ej. «el transporte está
// apagado en el flujo»), el mensaje va solo.
export function falloDeLaBase(error: ErrorConPista): ResultadoDeAccion<never> {
  const app = errorDePostgrest(error)
  const porCampo =
    app.codigo === 'regla' || app.codigo === 'duplicado'
      ? porCampoDe(error.hint, app.mensaje)
      : undefined
  return porCampo ? { ok: false, error: app, porCampo } : { ok: false, error: app }
}

export const inesperado = (): ResultadoDeAccion<never> => ({
  ok: false,
  error: { codigo: 'inesperado', mensaje: NO_SE_LEYO },
})
