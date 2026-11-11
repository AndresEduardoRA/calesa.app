// Composición del módulo en el servidor: aquí se decide qué implementación recibe cada interfaz de `entities/`. Las entradas importan de
// este archivo, nunca de `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type { LectorDeAgenda } from './entities/agenda'
import type { LectorDeEvento, LectorDeTarea } from './entities/detalle'
import type { LectorDeMisTareas } from './entities/mis-tareas'
import type { LectorDeRecordatorio } from './entities/recordatorio'
import { getAgenda } from './infra/queries/agenda'
import { repositorioDeEventos } from './infra/eventos'
import { getEvento, getTarea } from './infra/queries/detalle'
import { getMisTareas } from './infra/queries/mis-tareas'
import { getRecordatorio } from './infra/queries/recordatorio'
import { repositorioDeTareas } from './infra/tareas'

export const leerAgenda: LectorDeAgenda = getAgenda
export const leerEvento: LectorDeEvento = getEvento
export const leerTarea: LectorDeTarea = getTarea
export const leerRecordatorio: LectorDeRecordatorio = getRecordatorio
export const leerMisTareas: LectorDeMisTareas = getMisTareas

// Escribir (`evento_*` y `tarea_*`): lo usan las actions de `features/eventos` y `features/tareas`.
export { repositorioDeEventos, repositorioDeTareas }
