// La API de cliente del área `turnos` de `web` (8.05-1): la tarjeta de un turno sin confirmar, para el bloque de Inicio (`tablero`) y, en la Fase 7, la campana.
// La action sale también por aquí: un Client Component la llama por su entrada de cliente, y ella exige su permiso antes de escribir.
export { TarjetaTurno } from '../../features/turnos/tarjeta/components/tarjeta-de-turno'
export { ActualizarAlVolver } from '../../features/turnos/tarjeta/components/actualizar-al-volver'
export { confirmarContacto } from '../../features/turnos/actions/confirmar-contacto'
export {
  CLAVE_DE_ELEGIR_TURNO,
  CLAVE_DE_TURNO,
  PANEL_VINCULAR_TURNO,
} from '../../entities/turnos/paneles'
export type { Turno } from '../../entities/turnos/turnos'
