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
// lista blanca (el almacenamiento es del navegador y se puede tocar).
export function conValoresRepuestos(
  antes: ValoresDelSeguimiento,
  cambios: Partial<ValoresDelSeguimiento>,
): ValoresDelSeguimiento {
  return {
    ...antes,
    ...cambios,
    ...('detalle' in cambios ? { detalle: documentoLimpio(cambios.detalle) } : {}),
  }
}
