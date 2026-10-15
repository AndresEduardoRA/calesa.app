import type { ErrorApp } from '@/shared/lib/errores'
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

// El estado del redactor de un seguimiento. Puro: los cambios se prueban sin React.
export type EstadoDelRedactor = {
  valores: ValoresDelSeguimiento
  errores: ErroresDelSeguimiento
  // «Cambiaste este seguimiento hace 3 min desde otra ventana.»
  conflicto: string | null
  // Un rechazo que no es de ningún campo.
  aviso: string | null
  // Un guardado que no llegó al servidor y espera a que vuelva la conexión.
  pendiente: true | null
}

export const redactorLimpio = (valores: ValoresDelSeguimiento): EstadoDelRedactor => ({
  valores,
  errores: {},
  conflicto: null,
  aviso: null,
  pendiente: null,
})

// Lo escrito en un campo: su motivo ya no vale y el aviso general tampoco.
export function conValor<K extends keyof ValoresDelSeguimiento>(
  antes: EstadoDelRedactor,
  clave: K,
  valor: ValoresDelSeguimiento[K],
): EstadoDelRedactor {
  const errores = { ...antes.errores }
  if (clave !== 'visible') {
    delete errores[clave as keyof ErroresDelSeguimiento]
  }
  return { ...antes, valores: { ...antes.valores, [clave]: valor }, errores, aviso: null }
}

export function conErrores(
  antes: EstadoDelRedactor,
  errores: ErroresDelSeguimiento,
): EstadoDelRedactor {
  return { ...antes, errores, aviso: null, conflicto: null }
}

export function esperandoRed(antes: EstadoDelRedactor): EstadoDelRedactor {
  return { ...antes, pendiente: true, aviso: null }
}

// Lo que el servidor rechazó: el motivo junto a su campo, el conflicto en su aviso, o arriba.
// Lo escrito queda siempre.
export function rechazado(
  antes: EstadoDelRedactor,
  error: ErrorApp,
  porCampo?: Record<string, string>,
): EstadoDelRedactor {
  const esConflicto = error.codigo === 'conflicto'
  return {
    ...antes,
    pendiente: null,
    errores: (porCampo ?? {}) as ErroresDelSeguimiento,
    conflicto: esConflicto ? error.mensaje : null,
    aviso: esConflicto || porCampo ? null : error.mensaje,
  }
}

// «Recargar» trajo la versión de ahora: el conflicto ya no está y lo escrito se conserva.
export function sinConflicto(antes: EstadoDelRedactor): EstadoDelRedactor {
  return { ...antes, conflicto: null }
}

// --- Qué se manda ---------------------------------------------------------------------------------

export type PedidoDelRedactor =
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
export function pedidoDelRedactor(args: {
  valores: ValoresDelSeguimiento
  original: Seguimiento | null
  intento: string
  leadId: string
  ahora: string
  zona: string
  tiposActivos: readonly string[]
}): PedidoDelRedactor {
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
