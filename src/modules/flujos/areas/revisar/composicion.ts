// Composición del área `revisar` de `flujos` en el servidor (5.02, la llena el 5.12): une la interfaz de `entities/revisar/` con su implementación de
// `infra/revisar/`. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { LectorDeAvisosDeRevision } from '../../entities/revisar/repositorios'
import { leerAvisosDeRevision as leer } from '../../infra/revisar/leer-avisos'

// Los avisos de «Revisar» de un flujo, ordenados y con tope.
export const leerAvisosDeRevision: LectorDeAvisosDeRevision = leer
