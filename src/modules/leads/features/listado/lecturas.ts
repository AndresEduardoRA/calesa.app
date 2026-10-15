import 'server-only'
import type { Resultado } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, leerFiltros, type EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { ParametrosDeUrl, ValoresDeFiltros } from '@/shared/lib/filtros'
import { leerCursor, type Pagina } from '@/shared/lib/paginacion'
import type { Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import {
  buscarLeads,
  contarLeads,
  leerEtiquetas,
  leerLayoutDeLeads,
  leerOrigenesDeLead,
} from '../../composicion'
import type { OrigenDeLead } from '../../entities/alta'
import { CLAVE_DE_ALCANCE, alcanceDelListado, type ModoDelListado } from '../../entities/alcance'
import type { CampoDeLead } from '../../entities/campo'
import type { Etiqueta } from '../../entities/etiqueta'
import {
  condicionesDeLeads,
  esquemaDeFiltrosDeLeads,
  filtrosDescartados,
  type FiltroDescartado,
} from '../../entities/filtros'
import { FILTRO_TACHADOS, ocultaTachados } from '../../entities/filtros-de-marcas'
import { TAMANO_DE_PAGINA_DE_LEADS, clavesDeTabla, type FilaDeLead } from '../../entities/listado'

export type DatosDelListado = {
  esquema: EsquemaDeFiltros
  pagina: Pagina<FilaDeLead>
  // Todo el layout: la tabla y el drawer filtran los activos.
  campos: CampoDeLead[]
  origenes: OrigenDeLead[]
  // Las de quien mira: nombran las de cada fila y se ofrecen en el «⋯».
  etiquetas: Etiqueta[]
  modo: ModoDelListado
  puedeVerTodos: boolean
  // De la URL, lo que ya no se puede filtrar (una vista vieja): se avisa y se quita.
  descartados: FiltroDescartado[]
  // Cuántos leads que cumplen los filtros quedaron afuera por estar tachados (0 si no se ocultan).
  ocultos: number
}

type Entrada = {
  // Los efectivos de la sesión: con «ver como» son los del rol elegido.
  permisos: Permisos
  parametros: ParametrosDeUrl
  zona: string
}

// Los mismos filtros, pero sólo los tachados: lo que el aviso cuenta y «Mostrarlos» suma.
const soloTachados = (valores: ValoresDeFiltros): ValoresDeFiltros => ({
  ...valores,
  porClave: { ...valores.porClave, [FILTRO_TACHADOS]: { tipo: 'eleccion', valor: 'solo' } },
})

// Todo lo que el listado de `/leads` necesita: el layout, los orígenes y las etiquetas de quien
// mira, y después, en paralelo, una página de `leads_vista` y —si se están ocultando los
// tachados— cuántos quedaron afuera con los mismos filtros. Lo que hay lo decide la RLS; «míos» se
// traduce siempre en la condición `en_cartera` y «todos» no suma nada.
export async function leerListadoDeLeads(entrada: Entrada): Promise<Resultado<DatosDelListado>> {
  const { permisos, parametros, zona } = entrada
  const [layout, origenes, etiquetas] = await Promise.all([
    leerLayoutDeLeads(),
    leerOrigenesDeLead(),
    leerEtiquetas(),
  ])
  if (!layout.ok) {
    return layout
  }
  if (!origenes.ok) {
    return origenes
  }
  if (!etiquetas.ok) {
    return etiquetas
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
    etiquetas: etiquetas.data,
  })
  const valores = leerFiltros(esquema, parametros)
  const opciones = { zona, soloMios: modo === 'mios' }
  const [leida, ocultos] = await Promise.all([
    buscarLeads({
      condiciones: condicionesDeLeads(campos, valores, opciones),
      cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR] as string | string[] | undefined)),
      tamano: TAMANO_DE_PAGINA_DE_LEADS,
      clavesDeTabla: clavesDeTabla(campos),
    }),
    ocultaTachados(valores)
      ? contarLeads(condicionesDeLeads(campos, soloTachados(valores), opciones))
      : null,
  ])
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
      etiquetas: etiquetas.data,
      modo,
      puedeVerTodos,
      descartados: filtrosDescartados(campos, parametros, etiquetas.data),
      // Si contar falla, el listado se dibuja igual: sin el aviso.
      ocultos: ocultos?.ok ? ocultos.data : 0,
    },
  }
}
