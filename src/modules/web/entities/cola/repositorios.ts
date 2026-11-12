// Las lecturas (8.04-2) y las escrituras (8.04-3) del área `cola`. Las implementa `infra/cola/` y las une `areas/cola/composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { PoliticaDeLaCola } from './politica'
import type { ConfiguracionEnLaRueda } from './rueda'
import type { CursorDeSolicitudes, PaginaDeSolicitudes } from './solicitudes'
import type { Tablero } from './tablero'

export type LectorDelTablero = () => Promise<Resultado<Tablero>>

// `null`: la primera página.
export type LectorDeSinAsignar = (
  cursor: CursorDeSolicitudes | null,
) => Promise<Resultado<PaginaDeSolicitudes>>

export type LectorDePoliticaDeLaCola = () => Promise<Resultado<PoliticaDeLaCola>>

// Por `cola_web_configurar` (habilita o quita, y pisa cupo, prioridad y orden). Al habilitar, relee `puede_estar_en_la_rueda`: `enLaRueda` falso es
// «quedó habilitada, pero su rol no recibe turnos»; nulo, guardado pero sin poder releerlo. Al quitar, siempre falso.
export type EscritorDeLaRueda = (
  pedido: ConfiguracionEnLaRueda & { habilitado: boolean },
) => Promise<Resultado<{ enLaRueda: boolean | null }>>
