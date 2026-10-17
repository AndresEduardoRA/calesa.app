import 'server-only'
import type { ConteoAcotado } from '@/shared/lib/conteo'
import type { Resultado } from '@/shared/lib/errores'
import {
  CLAVE_DE_CURSOR,
  CLAVE_DE_POR_PAGINA,
  leerFiltros,
  type EsquemaDeFiltros,
} from '@/shared/lib/filtros'
import type { ParametrosDeUrl, ValoresDeFiltros } from '@/shared/lib/filtros'
import {
  leerCursor,
  leerPorPagina,
  tamanoDePagina,
  tamanosHasta,
  type Pagina,
} from '@/shared/lib/paginacion'
import type { Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import {
  buscarLeads,
  contarLeadsHasta,
  leerEtiquetas,
  leerLayoutDeLeads,
  leerOrigenesDeLead,
} from '../../composicion'
import type { OrigenDeLead } from '../../entities/alta'
import { CLAVE_DE_ALCANCE, alcanceDelListado, type ModoDelListado } from '../../entities/alcance'
import type { CampoDeLead } from '../../entities/campo'
import type { Etiqueta } from '../../entities/etiqueta'
import { condicionesDeLeads, esquemaDeFiltrosDeLeads } from '../../entities/filtros'
import { filtrosDescartados, type FiltroDescartado } from '../../entities/filtros-descartados'
import { FILTRO_TACHADOS, TOPE_DE_OCULTOS, ocultaTachados } from '../../entities/filtros-de-marcas'
import { MAXIMO_DE_PAGINA_DE_LEADS, clavesDeTabla, type FilaDeLead } from '../../entities/listado'
import { puedeEditarLead } from '../../entities/edicion'
import { idsDelNumeroBuscado } from './ids-del-numero'
import { puedeAbrirLaPapelera, puedeEnviarLead } from '../../entities/papelera'

export type DatosDelListado = {
  esquema: EsquemaDeFiltros
  pagina: Pagina<FilaDeLead>
  // «Ítems por página»: lo que dibuja esta página (la URL, si no la preferencia de quien mira) y los que ofrece el selector.
  porPagina: { valor: number; opciones: number[] }
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
  // Cuántos de los que cumplen los filtros quedan afuera por tachados: hasta 50, nunca el total.
  ocultos: ConteoAcotado
  // Los de esta página que quien mira puede enviar a la papelera (`leads.eliminar` con su alcance).
  eliminables: string[]
  // Quien mira puede abrir la papelera de leads (envía, o puede vaciarla).
  puedeAbrirPapelera: boolean
  // `leads.editar`: con el lead en la cartera, anotar y agendar desde el «⋯» de su fila.
  puedeAnotar: boolean
}

type Entrada = {
  // Los efectivos de la sesión: con «ver como» son los del rol elegido.
  permisos: Permisos
  parametros: ParametrosDeUrl
  zona: string
  // Quien mira: con `leads.eliminar` «propios» sólo envía lo que es suyo como dueño.
  usuarioId: string
  // De a cuántos eligió quien mira (`sesion.preferencias.porPagina`): siempre la de quien mira, también con «ver como».
  preferenciaDePagina: number | null
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
const SIN_OCULTOS: ConteoAcotado = { n: 0, hayMas: false }

export async function leerListadoDeLeads(entrada: Entrada): Promise<Resultado<DatosDelListado>> {
  const { permisos, parametros, zona, usuarioId, preferenciaDePagina } = entrada
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
  const ids = await idsDelNumeroBuscado(valores, permisos)
  if (!ids.ok) {
    return ids
  }
  const opciones = { zona, soloMios: modo === 'mios', idsDelNumero: ids.data }
  const tamano = tamanoDePagina({
    pedido: leerPorPagina(
      unParametro(parametros[CLAVE_DE_POR_PAGINA] as string | string[] | undefined),
    ),
    preferencia: preferenciaDePagina,
    maximo: MAXIMO_DE_PAGINA_DE_LEADS,
  })
  const [leida, ocultos] = await Promise.all([
    buscarLeads({
      condiciones: condicionesDeLeads(campos, valores, opciones),
      cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR] as string | string[] | undefined)),
      tamano,
      clavesDeTabla: clavesDeTabla(campos),
    }),
    ocultaTachados(valores)
      ? contarLeadsHasta(
          condicionesDeLeads(campos, soloTachados(valores), opciones),
          TOPE_DE_OCULTOS,
        )
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
      porPagina: { valor: tamano, opciones: tamanosHasta(MAXIMO_DE_PAGINA_DE_LEADS) },
      campos,
      origenes: origenes.data,
      etiquetas: etiquetas.data,
      modo,
      puedeVerTodos,
      descartados: filtrosDescartados(campos, parametros, etiquetas.data),
      // Si contar falla, el listado se dibuja igual: sin el aviso.
      ocultos: ocultos?.ok ? ocultos.data : SIN_OCULTOS,
      eliminables: leida.data.filas
        .filter((fila) => puedeEnviarLead(permisos, fila.duenoId, usuarioId))
        .map((fila) => fila.id),
      puedeAbrirPapelera: puedeAbrirLaPapelera(permisos),
      // Como si estuviera en la cartera: cada fila lo combina con la suya.
      puedeAnotar: puedeEditarLead(permisos, true),
    },
  }
}
