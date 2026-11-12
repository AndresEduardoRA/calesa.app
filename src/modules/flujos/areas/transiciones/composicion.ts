// Composición del área `transiciones` de `flujos` en el servidor (5.02, la llena el 5.06): une las interfaces de `entities/transiciones/` con su
// implementación de `infra/transiciones/`. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeTransiciones } from '../../entities/transiciones/repositorios'
import { transicionesSupabase } from '../../infra/transiciones/escribir'

export const repositorioDeTransiciones: RepositorioDeTransiciones = transicionesSupabase
