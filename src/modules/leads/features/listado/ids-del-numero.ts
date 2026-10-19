import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import type { ValoresDeFiltros } from '@/shared/lib/filtros'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { leerIdsDelNumero } from '../../composicion'
import { interpretarBusqueda } from '../../entities/filtros'
import { numeroQueSeBusca } from '../../entities/numero'

// «#124» (o «124») se resuelve a sus leads: con `leads.numero_global.ver`, el que tiene 124 de global y los que algún creador numeró 124; sin él, el propio de
// quien busca. Los ids vuelven vacíos si lo escrito no es un número o no hay lead visible con él. Es el único punto que decide qué leads coinciden con un
// número: lo usan el listado, el conteo de ocultos y la exportación, que arman las mismas condiciones.
export async function idsDelNumeroBuscado(
  valores: ValoresDeFiltros,
  permisos: Permisos,
): Promise<Resultado<string[]>> {
  const busqueda = interpretarBusqueda(valores.busqueda)
  if (busqueda?.numero == null) {
    return ok([])
  }
  const cual = numeroQueSeBusca(puede(permisos, 'leads.numero_global.ver'))
  return leerIdsDelNumero(busqueda.numero, { todos: cual === 'global_y_propios' })
}
