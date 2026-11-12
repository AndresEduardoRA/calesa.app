// Composición en el servidor del área `turnos` de `web`: qué implementación recibe cada interfaz de `entities/turnos`. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { LectorDeMiFichaEnLaWeb } from '../../entities/turnos/ficha'
import type { LectorDeMisTurnos } from '../../entities/turnos/turnos'
import { getMiFichaEnLaWeb } from '../../infra/turnos/mi-ficha'
import { getMisTurnos } from '../../infra/turnos/mis-turnos'

export const leerMisTurnos: LectorDeMisTurnos = getMisTurnos
// Mi lugar en la cola y mi ficha (`/perfil`, 8.05-2).
export const leerMiFichaEnLaWeb: LectorDeMiFichaEnLaWeb = getMiFichaEnLaWeb
