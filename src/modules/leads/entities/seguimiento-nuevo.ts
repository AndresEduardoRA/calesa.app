import { documentoLimpio } from './documento-limpio'
import type { ValoresDelSeguimiento } from './seguimiento'
import { VALOR_SIN_VEHICULO } from './vehiculo-de-nota'

// Con qué arranca el redactor de un seguimiento nuevo (el de la ficha y el del alta): el primer tipo
// activo, nada escrito, privado y «ahora».
export function valoresDeSeguimientoNuevo(tipos: readonly { id: string }[]): ValoresDelSeguimiento {
  return {
    tipoId: tipos[0]?.id ?? '',
    titulo: '',
    detalle: null,
    visible: false,
    ocurridoEn: '',
    recordatorio: '',
    vehiculo: VALOR_SIN_VEHICULO,
  }
}

// Lo escrito que vuelve de un borrador, mezclado sobre lo que hay: el detalle pasa otra vez por la
// lista blanca (el almacenamiento es del navegador y se puede tocar). Si se dan los tipos activos, un
// tipo que ya no lo es (se apagó desde el borrador) no se repone: se queda el que hay.
export function conValoresRepuestos(
  antes: ValoresDelSeguimiento,
  cambios: Partial<ValoresDelSeguimiento>,
  tiposActivos?: readonly string[],
): ValoresDelSeguimiento {
  const tipoVigente =
    cambios.tipoId === undefined || !tiposActivos || tiposActivos.includes(cambios.tipoId)
  const { tipoId: _tipo, ...resto } = cambios
  return {
    ...antes,
    ...resto,
    ...(tipoVigente && cambios.tipoId !== undefined ? { tipoId: cambios.tipoId } : {}),
    ...('detalle' in cambios ? { detalle: documentoLimpio(cambios.detalle) } : {}),
  }
}

// ¿La persona escribió algo del primer seguimiento? Cuenta el resumen, un detalle con texto, una fecha
// elegida y un próximo contacto. Cambiar sólo el tipo, o abrir «Otra fecha» sin elegir, no cuenta: el
// alta no pide un seguimiento por haber tocado un campo.
export function hayAlgoEscrito(valores: ValoresDelSeguimiento): boolean {
  return (
    valores.titulo.trim() !== '' ||
    valores.detalle !== null ||
    valores.ocurridoEn !== '' ||
    valores.recordatorio !== ''
  )
}
