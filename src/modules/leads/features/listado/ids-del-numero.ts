import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import type { ValoresDeFiltros } from '@/shared/lib/filtros'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { leerIdsDelNumero } from '../../composicion'
import { interpretarBusqueda } from '../../entities/filtros'
import { numeroQueSeBusca } from '../../entities/numero'

// «#124» (o «124») se resuelve a su lead con el número que la persona ve primero: el global con
// `leads.numero_global.ver`, el propio sin él. Los ids vuelven vacíos si lo escrito no es un número o no hay lead
// visible con él. Lo usan el listado y la exportación, que arman las mismas condiciones.
export async function idsDelNumeroBuscado(
  valores: ValoresDeFiltros,
  permisos: Permisos,
): Promise<Resultado<string[]>> {
  const busqueda = interpretarBusqueda(valores.busqueda)
  if (busqueda?.numero == null) {
    return ok([])
  }
  const cual = numeroQueSeBusca(puede(permisos, 'leads.numero_global.ver'))
  return leerIdsDelNumero(busqueda.numero, { global: cual === 'global' })
}
