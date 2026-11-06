// Las oportunidades de un lead cuando la lista crece: lo cargado es una ventana, más recientes primero (las abiertas antes que las
// cerradas), que empieza en lo más nuevo y termina donde llegó «Ver más». Lo que vuelve de una action se pone sólo si cae dentro de esa
// ventana: ponerlo fuera correría el cursor y «Ver más» saltearía filas. Lo cargado tiene tope (`TOPE_DE_LO_CARGADO`).
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { RUTAS } from '@/shared/lib/rutas'
import type { Embudo } from './embudo'
import type { Oportunidad, OportunidadDelLead } from './oportunidad'
import {
  busquedaDelEmbudo,
  CLAVE_DE_BUSQUEDA_DEL_EMBUDO,
  CLAVE_DE_EMBUDO,
  CLAVE_DE_VISTA,
  VISTA_EMBUDO,
} from './tablero'

// Lo cargado: la lista y si hay más hacia atrás.
export type VentanaDeOportunidades = {
  lista: readonly OportunidadDelLead[]
  hayMas: boolean
}

// El instante con sus microsegundos: los milisegundos, que lee `Date.parse`, y los dígitos 4.º a 6.º de la fracción. La base recorta los
// ceros finales (`…48.1234` y `…48.123400` son el mismo instante; sin fracción es `…48`), así que comparar el texto no sirve, y `Date.parse`
// solo empataría dos sellos del mismo milisegundo (4-90).
function instante(texto: string): readonly [number, number] {
  const fraccion = /\.(\d+)/.exec(texto)?.[1] ?? ''
  return [Date.parse(texto), Number(fraccion.padEnd(6, '0').slice(3, 6))]
}

function compararInstantes(a: string, b: string): number {
  const [msA, microA] = instante(a)
  const [msB, microB] = instante(b)
  return msA !== msB ? msA - msB : microA - microB
}

// El cursor de «Ver más»: la última fila de lo cargado. El instante va tal como llegó (nunca pasado por `Date`: perdería los microsegundos).
export type CursorDeOportunidades = { antesAbierta: boolean; antesEn: string; antesId: string }

export function cursorDeOportunidades(
  lista: readonly OportunidadDelLead[],
): CursorDeOportunidades | null {
  const ultima = lista.at(-1)
  return ultima
    ? {
        antesAbierta: ultima.estado === 'abierta',
        antesEn: ultima.enEtapaDesde,
        antesId: ultima.id,
      }
    : null
}

// Como las entrega la base: las abiertas primero y, en cada grupo, `ultima_actividad_en desc, id desc`. Negativo si `a` va antes que `b`.
export function ordenDeOportunidades(
  a: Pick<OportunidadDelLead, 'estado' | 'enEtapaDesde' | 'id'>,
  b: Pick<OportunidadDelLead, 'estado' | 'enEtapaDesde' | 'id'>,
): number {
  const abiertaA = a.estado === 'abierta'
  if (abiertaA !== (b.estado === 'abierta')) {
    return abiertaA ? -1 : 1
  }
  const instantes = compararInstantes(b.enEtapaDesde, a.enEtapaDesde)
  if (instantes !== 0) {
    return instantes
  }
  return b.id < a.id ? -1 : b.id > a.id ? 1 : 0
}

// «Ver más» suma al final sólo lo nuevo de la página que llegó: sin lo que ya está y sin lo que se quitó mientras tanto (`quitadas`: una
// eliminada no vuelve con una página que se pidió antes de eliminarla). Lo que se movió mientras esperaba sí entra, en su lugar nuevo.
// Nunca más que el tope; lo que pasa se corta y queda «hay más».
export function sumarPaginaDeOportunidades(
  ventana: VentanaDeOportunidades,
  pagina: VentanaDeOportunidades,
  quitadas: ReadonlySet<string>,
): VentanaDeOportunidades {
  const estan = new Set(ventana.lista.map((o) => o.id))
  const nuevas = pagina.lista.filter((o) => !estan.has(o.id) && !quitadas.has(o.id))
  const lista = [...ventana.lista, ...nuevas].sort(ordenDeOportunidades)
  return {
    lista: lista.slice(0, TOPE_DE_LO_CARGADO),
    hayMas: pagina.hayMas || lista.length > TOPE_DE_LO_CARGADO,
  }
}

// Pone (o reemplaza) una en la ventana, en su lugar. Una eliminada sale; una que cae después de la última cargada, con más por leer, sale
// también (vuelve con «Ver más», en su versión de ese momento); si la lista pasa del tope se corta la última y queda «hay más».
export function ponerOportunidadEnLaVentana(
  ventana: VentanaDeOportunidades,
  una: OportunidadDelLead,
): VentanaDeOportunidades {
  const sin = ventana.lista.filter((o) => o.id !== una.id)
  const ultima = sin.at(-1)
  const caeDespues = ventana.hayMas && ultima !== undefined && ordenDeOportunidades(una, ultima) > 0
  if (una.eliminada || caeDespues) {
    return { lista: sin, hayMas: ventana.hayMas }
  }
  const lista = [...sin, una].sort(ordenDeOportunidades)
  return lista.length > TOPE_DE_LO_CARGADO
    ? { lista: lista.slice(0, TOPE_DE_LO_CARGADO), hayMas: true }
    : { lista, hayMas: ventana.hayMas }
}

// La oportunidad que vuelve de una action (sin etapa ni embudo) como la dibuja la sección: su embudo y su etapa salen de los de la
// sección. Nula si alguno no está (un embudo que la sección no tiene).
export function oportunidadDelLeadDesde(
  oportunidad: Oportunidad,
  embudos: readonly Embudo[],
): OportunidadDelLead | null {
  const embudo = embudos.find((e) => e.id === oportunidad.embudoId)
  const etapa = embudo?.etapas.find((e) => e.id === oportunidad.etapaId)
  if (!embudo || !etapa) {
    return null
  }
  return {
    ...oportunidad,
    etapa: {
      id: etapa.id,
      nombre: etapa.nombre,
      color: etapa.color,
      esGanada: etapa.esGanada,
      esPerdida: etapa.esPerdida,
    },
    embudo: { id: embudo.id, nombre: embudo.nombre },
  }
}

// El camino a lo antiguo cuando lo cargado llega al tope: el kanban del embudo de la última cargada, buscando por el nombre del lead (la
// búsqueda del embudo mira el título y el nombre del lead en todas las columnas, también las cerradas). Sin búsqueda si el nombre es muy corto.
export function caminoAlEmbudo(embudoId: string, nombreDelLead: string): string {
  const consulta = new URLSearchParams({
    [CLAVE_DE_VISTA]: VISTA_EMBUDO,
    [CLAVE_DE_EMBUDO]: embudoId,
  })
  const buscar = busquedaDelEmbudo(nombreDelLead)
  if (buscar !== null) {
    consulta.set(CLAVE_DE_BUSQUEDA_DEL_EMBUDO, buscar)
  }
  return `${RUTAS.leads}?${consulta.toString()}`
}
