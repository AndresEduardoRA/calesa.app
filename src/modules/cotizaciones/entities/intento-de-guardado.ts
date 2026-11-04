import { z } from 'zod'
import type { Envio } from '@/shared/lib/enviar-accion'
import type { ResultadoDeCrear } from './guardado'
import type { PedidoDeEdicion } from './pedido-de-edicion'
import type { PedidoDeGuardado } from './pedido-de-guardado'

// El intento de un guardado (4-21): un pedido que salió y del que no se sabe si llegó queda **pendiente**, y el próximo guardado reenvía ese pedido con ese intento, no lo
// que hay en la hoja. Así la base devuelve lo guardado (`repetido`) en vez de crear otra cotización.

// Lo que vuelve de un guardado: la action siempre responde `ok(ResultadoDeCrear)` cuando corrió; `{ ok: false }` sale de `enviarAccion()`.
export type EnvioDeGuardado = Envio<ResultadoDeCrear>

export function queEnviar<P>(pendiente: P | null, nuevo: P): { pedido: P; esReenvio: boolean } {
  return pendiente === null
    ? { pedido: nuevo, esReenvio: false }
    : { pedido: pendiente, esReenvio: true }
}

// «Respuesta perdida», sin ambigüedad: se conserva el pendiente sólo si no se sabe si la transacción terminó. Sin red; un `serverError` (`no_autenticado` no corrió y reenviar
// tras ingresar es seguro; `inesperado` pudo lanzar después de la RPC); un error sin SQLSTATE o una respuesta ilegible. **Todo error con SQLSTATE lo suelta:** la transacción
// de la RPC se deshizo entera. Reenviado, `cotizacion_crear` siempre guarda (o devuelve el repetido) o contesta con un código: el pendiente no se queda pegado.
export function trasElEnvio(envio: EnvioDeGuardado): 'conservar' | 'soltar' {
  if (!envio.ok) {
    return 'sinRed' in envio || envio.error.codigo !== 'validacion' ? 'conservar' : 'soltar'
  }
  return envio.data.tipo === 'perdida' ? 'conservar' : 'soltar'
}

const esquemaDelPendiente = z.object({
  intento: z.string().min(1),
  origenId: z.string(),
  leadId: z.string(),
  vehiculoId: z.string().nullable(),
  abierta: z.string(),
  entradas: z.object({
    inputs: z.record(z.string(), z.number()),
    banderas: z.record(z.string(), z.boolean()),
    overrides: z.record(z.string(), z.number()),
    variante: z.string().optional(),
  }),
  // Un pendiente de antes del despliegue no los traía: se reenvía igual que salió.
  modoTc: z.string().nullable().default(null),
  verTotalBs: z.boolean().default(false),
  conLaAbierta: z.boolean(),
})

export const serializarPendiente = (pedido: PedidoDeGuardado): string => JSON.stringify(pedido)

// Lo que había en la pestaña; uno ilegible (otra versión de la pantalla, editado a mano) se ignora.
export function leerPendiente(texto: string | null): PedidoDeGuardado | null {
  if (texto === null) {
    return null
  }
  try {
    const leido = esquemaDelPendiente.safeParse(JSON.parse(texto))
    return leido.success ? leido.data : null
  } catch {
    return null
  }
}

// El pendiente de una edición (4.15-3, C9): la misma idea para `cotizacion_guardar`, con la versión que vio quien editó (el texto de la base) y los nueve datos. Un pedido de la hoja
// nueva no se lee como una edición, ni al revés.
const esquemaDelPendienteDeEdicion = z.object({
  intento: z.string().min(1),
  cotizacionId: z.string(),
  actualizadoEn: z.string().min(1),
  entradas: esquemaDelPendiente.shape.entradas,
  modoTc: z.string().nullable(),
  verTotalBs: z.boolean(),
  titulo: z.string().nullable(),
  notas: z.string().nullable(),
  vehiculoId: z.string().nullable(),
})

export const serializarPendienteDeEdicion = (pedido: PedidoDeEdicion): string =>
  JSON.stringify(pedido)

export function leerPendienteDeEdicion(texto: string | null): PedidoDeEdicion | null {
  if (texto === null) {
    return null
  }
  try {
    const leido = esquemaDelPendienteDeEdicion.safeParse(JSON.parse(texto))
    return leido.success ? leido.data : null
  } catch {
    return null
  }
}
