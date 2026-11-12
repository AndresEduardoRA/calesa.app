// Composición del área `mover` de `flujos` en el servidor (5.02, 6.01, 6.04). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { LectorDeFlujoDeOrigen, RepositorioDeMover } from '../../entities/mover/repositorios'
import { getFlujoDeOrigen } from '../../infra/mover/flujo-de-origen'
import { moverSupabase } from '../../infra/mover/mover'

// El flujo del origen para mover (6.01): reglas activas y atributos de las fases.
export const leerFlujoDeOrigen: LectorDeFlujoDeOrigen = getFlujoDeOrigen

// Las RPC de mover y sus lecturas (6.04), que usan las actions del área.
export const repositorioDeMover: RepositorioDeMover = moverSupabase
