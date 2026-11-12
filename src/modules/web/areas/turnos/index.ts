// La API de servidor del área `turnos` de `web`. Sale por el `index.ts` de la raíz.
// ¿El rol de esta persona recibe turnos de la web? (`web.cola.participar`; la regla de la base es `puede_estar_en_la_rueda`).
export { puedeEstarEnLaRueda } from '../../entities/turnos/rueda'
// Mis turnos sin confirmar (Inicio, 8.05-1) y «Contacté» / «Vincular a lead» (también para la campana de la Fase 7).
export { leerMisTurnos } from './composicion'
export { confirmarContacto } from '../../features/turnos/actions/confirmar-contacto'
export type { Turno, EstadoDeTurno } from '../../entities/turnos/turnos'
