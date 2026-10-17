import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import type { ParametrosDeUrl } from '@/shared/lib/filtros'
import { TAMANO_DE_COLUMNA } from '@/shared/lib/paginacion'
import { unParametro } from '@/shared/lib/rutas'
import { leerEmbudos, leerTablero } from '../../composicion'
import type { Embudo } from '../../entities/embudo'
import {
  CLAVE_DE_BUSQUEDA_DEL_EMBUDO,
  CLAVE_DE_EMBUDO,
  busquedaDelEmbudo,
  type Tablero,
} from '../../entities/tablero'

export type DatosDelEmbudo = {
  // Los de quien mira (vacío la primera vez: la vista crea el de por defecto).
  embudos: Embudo[]
  // El kanban del embudo elegido (el de la URL si es suyo; si no, el de por defecto).
  tablero: Tablero | null
}

// `/leads?vista=embudo`: los embudos de quien mira y el kanban del elegido, con la búsqueda de `?q=` (cierre 1). Los
// filtros del listado no aplican acá. Sólo las oportunidades propias sobre leads vivos de la cartera (lo decide la RLS).
export async function leerVistaDeEmbudo(
  parametros: ParametrosDeUrl,
): Promise<Resultado<DatosDelEmbudo>> {
  const embudos = await leerEmbudos()
  if (!embudos.ok) {
    return embudos
  }
  const pedido = unParametro(parametros[CLAVE_DE_EMBUDO] ?? undefined)
  const elegido = embudos.data.find((e) => e.id === pedido) ?? embudos.data[0]
  if (!elegido) {
    return ok({ embudos: [], tablero: null })
  }
  const buscar = busquedaDelEmbudo(
    unParametro(parametros[CLAVE_DE_BUSQUEDA_DEL_EMBUDO] ?? undefined),
  )
  const tablero = await leerTablero({ embudoId: elegido.id, tope: TAMANO_DE_COLUMNA, buscar })
  if (!tablero.ok) {
    return tablero
  }
  return ok({ embudos: embudos.data, tablero: tablero.data })
}
