// Composición del área `mover` de `flujos` en el servidor (5.02): la llena el paso el paso que mueve de fase (Fase 6). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { LectorDeFlujoDeOrigen } from '../../entities/mover/repositorios'
import { getFlujoDeOrigen } from '../../infra/mover/flujo-de-origen'

// El flujo del origen para mover (6.01): reglas activas y atributos de las fases.
export const leerFlujoDeOrigen: LectorDeFlujoDeOrigen = getFlujoDeOrigen
