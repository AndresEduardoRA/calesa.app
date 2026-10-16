import type { PrimerSeguimientoDeAlta } from './alta'
import { hayAlgoEscrito } from './seguimiento-nuevo'
import {
  validarSeguimiento,
  type ErroresDelSeguimiento,
  type ValoresDelSeguimiento,
} from './seguimiento'

// El primer seguimiento del alta, de lo escrito a lo que se manda. Las mismas reglas que el redactor de
// la ficha (`validarSeguimiento`), y la misma lista blanca del detalle. Esta pieza trae el validador del
// documento y las fechas: el alta la pide con `import()` recién al guardar con algo escrito.
export type PrimerSeguimiento =
  // Nada escrito: el lead se crea sin seguimiento.
  | { tipo: 'sin' }
  | { tipo: 'invalido'; errores: ErroresDelSeguimiento }
  | {
      tipo: 'con'
      seguimiento: PrimerSeguimientoDeAlta
      // El próximo contacto, si se programó (el instante, en UTC).
      recordatorio: { recordarEn: string } | null
    }

export function primerSeguimiento(
  valores: ValoresDelSeguimiento,
  contexto: { ahora: string; zona: string; tiposActivos: readonly string[] },
): PrimerSeguimiento {
  if (!hayAlgoEscrito(valores)) {
    return { tipo: 'sin' }
  }
  // «Visible para el cliente» y el vehículo no entran al alta: viajan en su valor de siempre.
  const valido = validarSeguimiento({ ...valores, visible: false, vehiculo: '' }, contexto)
  if (!valido.ok) {
    return { tipo: 'invalido', errores: valido.errores }
  }
  return {
    tipo: 'con',
    seguimiento: {
      tipoId: valido.tipoId,
      titulo: valido.titulo,
      detalle: valido.detalle,
      ocurridoEn: valido.ocurridoEn,
    },
    recordatorio: valido.recordarEn === null ? null : { recordarEn: valido.recordarEn },
  }
}
