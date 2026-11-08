// Composición del área `final` de `cotizaciones` en el servidor (4.15-4). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeFinal } from '../../entities/final/repositorio'
import { finalSupabase } from '../../infra/final/marcar'

// Marcar final (4.25-2). La action de `features/final/` lo usa; sale por la raíz sólo por el nombre.
export const repositorioDeFinal: RepositorioDeFinal = finalSupabase
