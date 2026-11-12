// Composición en el servidor del área `turnos` de `web`: qué implementación recibe cada interfaz de `entities/turnos`. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { LectorDeMisTurnos } from '../../entities/turnos/turnos'
import { getMisTurnos } from '../../infra/turnos/mis-turnos'

export const leerMisTurnos: LectorDeMisTurnos = getMisTurnos
