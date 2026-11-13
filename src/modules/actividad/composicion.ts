// Composición del módulo en el servidor: los casos de uso y `src/app` importan de acá, nunca de `infra/`.
import 'server-only'
import { getPaginaDeActividad, getPersonasDeLaActividad } from './infra/actividad'

export const leerPaginaDeActividad = getPaginaDeActividad
export const leerPersonasDeLaActividad = getPersonasDeLaActividad
