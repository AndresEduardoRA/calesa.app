// Composición del área `comprobantes` de `cotizaciones` en el servidor (4.15-4). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeComprobantes } from '../../entities/comprobantes/repositorio'
import { comprobantesSupabase } from '../../infra/comprobantes/escribir'

// Emitir y anular (4.26-2). Las actions de `features/comprobantes/` lo usan.
export const repositorioDeComprobantes: RepositorioDeComprobantes = comprobantesSupabase

// Los comprobantes de una cotización, para la cabecera y la sección de la guardada (4.26-2).
export { leerComprobantesDeLaCotizacion } from '../../infra/comprobantes/leer'

// La serie vigente, para su pestaña de Configuración › Empresa (4.26-3).
export { leerSerieVigente } from '../../infra/comprobantes/serie'
