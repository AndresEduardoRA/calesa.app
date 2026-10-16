import { vehiculoAlCrear } from '../../../entities/vehiculo-de-nota'
import type { Documento } from '../../../entities/documento'
import {
  cambiosDelSeguimiento,
  validarSeguimiento,
  type CambiosDeSeguimiento,
  type ErroresDelSeguimiento,
  type Seguimiento,
  type ValoresDelSeguimiento,
  type Visibilidad,
} from '../../../entities/seguimiento'

// Lo que manda el modal de un seguimiento. Puro: se prueba sin React.
export type PedidoDelSeguimiento =
  | { tipo: 'invalido'; errores: ErroresDelSeguimiento }
  | { tipo: 'sin_cambios' }
  | {
      tipo: 'crear'
      pedido: {
        id: string
        leadId: string
        tipoId: string
        titulo: string
        detalle: Documento | null
        visibilidad: Visibilidad
        ocurridoEn: string | null
        recordatorio: { recordarEn: string } | null
        vehiculoId: string | null
      }
    }
  | {
      tipo: 'guardar'
      pedido: { id: string; actualizadoEnEsperado: string; cambios: CambiosDeSeguimiento }
    }

// De lo escrito, lo que se manda: el alta con su id de intento, o sólo lo que cambió con la versión
// que se tenía en pantalla. Con las reglas de la base, antes de enviar.
export function pedidoDelSeguimiento(args: {
  valores: ValoresDelSeguimiento
  original: Seguimiento | null
  intento: string
  leadId: string
  ahora: string
  zona: string
  tiposActivos: readonly string[]
}): PedidoDelSeguimiento {
  const { valores, original, intento, leadId, ahora, zona, tiposActivos } = args
  const valido = validarSeguimiento(valores, { ahora, zona, tiposActivos }, original)
  if (!valido.ok) {
    return { tipo: 'invalido', errores: valido.errores }
  }
  if (!original) {
    const { ok: _ok, recordarEn, vehiculo, ...datos } = valido
    return {
      tipo: 'crear',
      pedido: {
        id: intento,
        leadId,
        ...datos,
        recordatorio: recordarEn === null ? null : { recordarEn },
        vehiculoId: vehiculoAlCrear(vehiculo),
      },
    }
  }
  const cambios = cambiosDelSeguimiento(original, valido)
  return Object.keys(cambios).length === 0
    ? { tipo: 'sin_cambios' }
    : {
        tipo: 'guardar',
        pedido: { id: original.id, actualizadoEnEsperado: original.actualizadoEn, cambios },
      }
}
