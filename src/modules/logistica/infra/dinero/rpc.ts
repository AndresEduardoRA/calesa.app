import 'server-only'
import { errorDePostgrest, type ErrorPostgrest } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'

// Lo que comparten las escrituras de gastos y de pagos por RPC (6.11): traducir lo que la base rechaza. Lo rechazado vuelve con su mensaje ya escrito; el `hint` de una validación
// nombra el campo, y aquí se traduce al del formulario.
export const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

const CAMPO_DEL_FORMULARIO: Record<string, string> = {
  categoria_id: 'categoriaId',
  moneda: 'moneda',
  monto: 'monto',
  tipo_cambio: 'tipoCambioId',
  tipo_cambio_id: 'tipoCambioId',
  fecha: 'fecha',
  comprobante_ruta: 'comprobanteRuta',
  concepto: 'concepto',
  metodo: 'metodo',
  motivo: 'motivo',
}

type ErrorConPista = ErrorPostgrest & { hint?: string | null }

export function falloDeLaBase(error: ErrorConPista): ResultadoDeAccion<never> {
  const app = errorDePostgrest(error)
  const campo = error.hint ? CAMPO_DEL_FORMULARIO[error.hint] : undefined
  return campo && app.codigo === 'regla'
    ? { ok: false, error: app, porCampo: { [campo]: app.mensaje } }
    : { ok: false, error: app }
}

// Las RPC de dinero no declaran valores por omisión y sus tipos generados no admiten nulo; la base sí (un parámetro nulo es «no va»).
export function nuloParaLaBase(valor: string | null): string {
  return valor as string
}

export const inesperado = (): ResultadoDeAccion<never> => ({
  ok: false,
  error: { codigo: 'inesperado', mensaje: NO_SE_LEYO },
})
