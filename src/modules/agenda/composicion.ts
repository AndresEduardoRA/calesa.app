// Composición del módulo en el servidor: aquí se decide qué implementación recibe cada interfaz de `entities/`. Las entradas importan de
// este archivo, nunca de `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type { LectorDeAgenda } from './entities/agenda'
import type { LectorDeEvento, LectorDeTarea } from './entities/detalle'
import { getAgenda } from './infra/queries/agenda'
import { getEvento, getTarea } from './infra/queries/detalle'

export const leerAgenda: LectorDeAgenda = getAgenda
export const leerEvento: LectorDeEvento = getEvento
export const leerTarea: LectorDeTarea = getTarea
