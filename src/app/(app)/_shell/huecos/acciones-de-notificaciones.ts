import type { AccionesPorTipo } from '@/modules/notificaciones/shell.client'

// La acción propia de cada tipo de aviso, por su `tipo` (`notificaciones.tipo`): la campana y `/notificaciones` la
// dibujan debajo de la fila. Vive acá y no en el módulo porque una función no cruza de servidor a cliente. Hoy
// ningún tipo la tiene; la Fase 8 suma «Contacté» de `turno_web` editando sólo este registro.
export const ACCIONES_DE_NOTIFICACIONES: AccionesPorTipo = {}
