// Composición del área `papelera` de `cotizaciones` en el servidor (4.15-4). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDePapeleraDeCotizaciones } from '../../entities/papelera/repositorio'
import { papeleraDeCotizacionesSupabase } from '../../infra/papelera/escribir'
import { getPapeleraDeCotizaciones } from '../../infra/papelera/listar'

// Una página de lotes de la papelera de cotizaciones (4.24-2): los de quien mira o, con la clave de vaciarla, todos.
export const leerPapeleraDeCotizaciones = getPapeleraDeCotizaciones

// Restaurar un lote, entero o por partes, con su versión (4.24-2). La action de `features/papelera/` la usa; sale por la raíz sólo por el nombre.
export const repositorioDePapeleraDeCotizaciones: RepositorioDePapeleraDeCotizaciones =
  papeleraDeCotizacionesSupabase
