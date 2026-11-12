// Composición del área `reglas` de `flujos` en el servidor (5.02, la llena el 5.11): une las interfaces de `entities/reglas/` con su
// implementación de `infra/reglas/`. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeReglas } from '../../entities/reglas/repositorios'
import { reglasSupabase } from '../../infra/reglas/escribir-reglas'
import { leerCatalogoDeTransporte, leerOfertaDeTransporte } from '../../infra/reglas/oferta'

export { leerCatalogoDeTransporte, leerOfertaDeTransporte }

// Impacto de apagar una regla, cambiarla y guardar la oferta: sólo las llaman las actions de `features/reglas/`.
export const repositorioDeReglas: RepositorioDeReglas = reglasSupabase
