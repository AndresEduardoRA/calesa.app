import 'server-only'
import type { Resultado } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, leerFiltros, type EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { ParametrosDeUrl } from '@/shared/lib/filtros'
import { leerCursor, type Pagina } from '@/shared/lib/paginacion'
import type { Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { buscarLeads, leerLayoutDeLeads, leerOrigenesDeLead } from '../../composicion'
import type { OrigenDeLead } from '../../entities/alta'
import { CLAVE_DE_ALCANCE, alcanceDelListado, type ModoDelListado } from '../../entities/alcance'
import type { CampoDeLead } from '../../entities/campo'
import {
  condicionesDeLeads,
  esquemaDeFiltrosDeLeads,
  filtrosDescartados,
  type FiltroDescartado,
} from '../../entities/filtros'
import { TAMANO_DE_PAGINA_DE_LEADS, clavesDeTabla, type FilaDeLead } from '../../entities/listado'

export type DatosDelListado = {
  esquema: EsquemaDeFiltros
  pagina: Pagina<FilaDeLead>
  // Todo el layout: la tabla y el drawer filtran los activos.
  campos: CampoDeLead[]
  origenes: OrigenDeLead[]
  modo: ModoDelListado
  puedeVerTodos: boolean
  // De la URL, lo que ya no se puede filtrar (una vista vieja): se avisa y se quita.
  descartados: FiltroDescartado[]
}

type Entrada = {
  // Los efectivos de la sesión: con «ver como» son los del rol elegido.
  permisos: Permisos
  parametros: ParametrosDeUrl
  zona: string
}

// Todo lo que el listado de `/leads` necesita, en un viaje: el layout, los orígenes y una página
// de `leads_vista`. Lo que hay en ella lo decide la RLS; «míos» se traduce siempre en la condición
// `en_cartera` (no es un adorno de la pantalla) y «todos» no suma nada.
export async function leerListadoDeLeads(entrada: Entrada): Promise<Resultado<DatosDelListado>> {
  const { permisos, parametros, zona } = entrada
  const [layout, origenes] = await Promise.all([leerLayoutDeLeads(), leerOrigenesDeLead()])
  if (!layout.ok) {
    return layout
  }
  if (!origenes.ok) {
    return origenes
  }
  const campos = layout.data
  const { puedeVerTodos, modo } = alcanceDelListado(
    permisos,
    unParametro(parametros[CLAVE_DE_ALCANCE] as string | string[] | undefined),
  )
  const esquema = esquemaDeFiltrosDeLeads({
    campos,
    origenes: origenes.data,
    verTodos: puedeVerTodos,
  })
  const leida = await buscarLeads({
    condiciones: condicionesDeLeads(campos, leerFiltros(esquema, parametros), {
      zona,
      soloMios: modo === 'mios',
    }),
    cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR] as string | string[] | undefined)),
    tamano: TAMANO_DE_PAGINA_DE_LEADS,
    clavesDeTabla: clavesDeTabla(campos),
  })
  if (!leida.ok) {
    return leida
  }
  return {
    ok: true,
    data: {
      esquema,
      pagina: leida.data,
      campos,
      origenes: origenes.data,
      modo,
      puedeVerTodos,
      descartados: filtrosDescartados(campos, parametros),
    },
  }
}
