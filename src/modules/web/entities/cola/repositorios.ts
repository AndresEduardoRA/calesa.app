// Las lecturas del área `cola` (8.04-2). Las implementa `infra/cola/` y las une `areas/cola/composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { PoliticaDeLaCola } from './politica'
import type { CursorDeSolicitudes, PaginaDeSolicitudes } from './solicitudes'
import type { Tablero } from './tablero'

export type LectorDelTablero = () => Promise<Resultado<Tablero>>

// `null`: la primera página.
export type LectorDeSinAsignar = (
  cursor: CursorDeSolicitudes | null,
) => Promise<Resultado<PaginaDeSolicitudes>>

export type LectorDePoliticaDeLaCola = () => Promise<Resultado<PoliticaDeLaCola>>
