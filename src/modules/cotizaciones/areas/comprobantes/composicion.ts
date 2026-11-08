// Composición del área `comprobantes` de `cotizaciones` en el servidor (4.15-4). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeComprobantes } from '../../entities/comprobantes/repositorio'
import { comprobantesSupabase } from '../../infra/comprobantes/escribir'

// Emitir y anular (4.26-2). Las actions de `features/comprobantes/` lo usan.
export const repositorioDeComprobantes: RepositorioDeComprobantes = comprobantesSupabase
