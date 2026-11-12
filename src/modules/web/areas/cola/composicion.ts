// Composición en el servidor del área `cola` de `web`: qué implementación recibe cada interfaz de `entities/cola/repositorios` (8.04-2: las lecturas del
// tablero; la 8.04-3 suma las escrituras). Sale por la `composicion.ts` de la raíz; nunca `infra/` directo desde `features`.
import 'server-only'
import type {
  LectorDePoliticaDeLaCola,
  LectorDelTablero,
  LectorDeSinAsignar,
} from '../../entities/cola/repositorios'
import { leerPolitica } from '../../infra/cola/politica'
import { leerSinAsignar as leerSinAsignarSupabase } from '../../infra/cola/solicitudes'
import { leerTablero } from '../../infra/cola/tablero'

export const leerTableroDeLaCola: LectorDelTablero = leerTablero
export const leerSinAsignar: LectorDeSinAsignar = leerSinAsignarSupabase
export const leerPoliticaDeLaCola: LectorDePoliticaDeLaCola = leerPolitica
