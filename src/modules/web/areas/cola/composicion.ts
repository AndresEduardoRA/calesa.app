// Composición en el servidor del área `cola` de `web`: qué implementación recibe cada interfaz de `entities/cola/repositorios` (8.04-2: las lecturas del
// tablero; 8.04-3: las escrituras). Sale por la `composicion.ts` de la raíz; nunca `infra/` directo desde `features`.
import 'server-only'
import type {
  EscritorDeLaRueda,
  EscritorDePoliticaDeLaCola,
  LectorDePoliticaDeLaCola,
  LectorDelTablero,
  LectorDeSinAsignar,
} from '../../entities/cola/repositorios'
import { configurarEnLaRueda as configurarEnLaRuedaSupabase } from '../../infra/cola/configurar'
import { guardarPolitica } from '../../infra/cola/guardar-politica'
import { leerPolitica } from '../../infra/cola/politica'
import { leerSinAsignar as leerSinAsignarSupabase } from '../../infra/cola/solicitudes'
import { leerTablero } from '../../infra/cola/tablero'

export const leerTableroDeLaCola: LectorDelTablero = leerTablero
export const leerSinAsignar: LectorDeSinAsignar = leerSinAsignarSupabase
export const leerPoliticaDeLaCola: LectorDePoliticaDeLaCola = leerPolitica
// La base repite el permiso en cada escritura (`assert_permiso('web.cola.gestionar')`).
export const configurarEnLaRueda: EscritorDeLaRueda = configurarEnLaRuedaSupabase
export const guardarPoliticaDeLaCola: EscritorDePoliticaDeLaCola = guardarPolitica
