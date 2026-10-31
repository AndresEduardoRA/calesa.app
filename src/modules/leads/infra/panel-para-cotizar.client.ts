// Las lecturas del panel del cliente de la hoja de cotizar, en el navegador y con la sesión de quien mira: la RLS de `leads` decide qué llega. Van por el
// navegador porque cambiar de pestaña o de página no puede pedirle la página al servidor: la hoja abierta se volvería a montar. Una página de
// `TAMANO_DE_VER_MAS` y una fila de más para saber si hay otra.
import {
  errorDePostgrest,
  fallo,
  MENSAJE_INESPERADO,
  ok,
  type ErrorPostgrest,
  type Resultado,
} from '@/shared/lib/errores'
import { memoriaDeLectura } from '@/shared/lib/memoria-de-lectura'
import {
  armarPaginaPor,
  TAMANO_DE_VER_MAS,
  type Cursor,
  type Pagina,
} from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import type { Json } from '@/shared/types/database.types'
import { aplicarCursor, ordenarPorCursor } from '@/shared/lib/supabase/consultas'
import { candidatosDesde } from '../entities/candidatos'
import { catalogosDeLeadDesde, type CatalogosDeLead } from '../entities/catalogos'
import {
  clientesDelPanelDesde,
  columnasDelPanel,
  instanteDelPanel,
  ORDEN_DEL_PANEL,
  pedidoDeCandidatos,
  type BusquedaDelPanel,
  type ClienteDelPanel,
  type ListaDelPanel,
} from '../entities/panel-para-cotizar'

export type PedidoDelPanel = {
  lista: ListaDelPanel
  // Los tipos de la clase de la pestaña (`idsDeTiposDeLaClase()`); vacío en «Todos» y en la búsqueda.
  tiposDeLaClase: readonly string[]
  cursor: Cursor | null
  // Lo que se busca, para la lista `'busqueda'`.
  busqueda: BusquedaDelPanel | null
  // Con `leads.numero_global.ver`, «#n» busca el global y el propio de cualquier creador; sin él, el propio (lo resuelve la base).
  todos: boolean
}

const MENSAJE_DE_LECTURA = 'No se pudieron cargar los leads.'

type PaginaLeida = Resultado<Pagina<ClienteDelPanel>>

// «Míos»: `leads_cartera_vista` por `leads_asesores_reciente_idx` (asesor_id, lead_reciente_en desc, lead_id desc) de lo reciente a lo antiguo; la pestaña de
// una clase suma `tipo_lead_id in (…)`, que la base resuelve como filtro sobre el recorrido de la cartera: con una clase que la persona no tiene recorre
// su cartera entera (≤ 400 ms con 80.000, el límite declarado de 4-65, `docs/RENDIMIENTO.md`).
async function leerMios(pedido: PedidoDelPanel): Promise<PaginaLeida> {
  const { lista, tiposDeLaClase, cursor } = pedido
  // Una clase siempre tiene algún tipo (la base lo impone): sin ninguno no hay leads de ella.
  if (lista !== 'todos' && tiposDeLaClase.length === 0) {
    return ok({ filas: [], siguiente: null, anterior: null })
  }
  const orden = ORDEN_DEL_PANEL[lista]
  const base = createClient().from('leads_cartera_vista').select(columnasDelPanel(lista))
  const filtrada = lista === 'todos' ? base : base.in('tipo_lead_id', [...tiposDeLaClase])
  const { data, error } = await ordenarPorCursor(
    aplicarCursor(filtrada, cursor, orden),
    cursor,
    orden,
  ).limit(TAMANO_DE_VER_MAS + 1)
  return paginaDe(data, error, pedido)
}

function paginaDe(
  data: unknown,
  error: ErrorPostgrest | null,
  pedido: PedidoDelPanel,
): PaginaLeida {
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const { lista, cursor } = pedido
  const clientes = clientesDelPanelDesde(data, lista)
  if (clientes === null) {
    return fallo('inesperado', MENSAJE_DE_LECTURA)
  }
  return ok(
    armarPaginaPor(clientes, TAMANO_DE_VER_MAS, cursor, (c) => instanteDelPanel(lista, c) ?? ''),
  )
}

// Los leads con el número buscado que quien mira ve (como mucho 100): índices `leads_numeros_globales_numero_key` y `leads_numeros_propios_creador_idx`.
async function leerIdsDelNumero(numero: number, todos: boolean): Promise<Resultado<string[]>> {
  const { data, error } = await createClient().rpc('leads_ids_del_numero', {
    p_numero: numero,
    p_todos: todos,
  })
  return error ? { ok: false, error: errorDePostgrest(error) } : ok(data)
}

// La búsqueda es la del listado (`leerPorCandidatos`): una ventana de `leads_candidatos()` —sin condiciones de página, los candidatos son la página y la ventana trae
// hasta 300— y sus filas de `leads_vista_por_ids()` en el orden de alta. Sólo número: son los ids de ese número. La RLS dice cuáles ve quien mira.
async function leerBusqueda(pedido: PedidoDelPanel): Promise<PaginaLeida> {
  const { busqueda, cursor, todos } = pedido
  if (busqueda === null) {
    return fallo('inesperado', 'No hay nada que buscar.')
  }
  const delNumero =
    busqueda.numero === null ? ok<string[]>([]) : await leerIdsDelNumero(busqueda.numero, todos)
  if (!delNumero.ok) {
    return delNumero
  }
  let ids = delNumero.data
  const filtros = pedidoDeCandidatos(busqueda, delNumero.data, cursor)
  if (filtros !== null) {
    const { data, error } = await createClient().rpc('leads_candidatos', {
      p_filtros: filtros as unknown as Json,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const candidatos = candidatosDesde(data)
    if (candidatos === null) {
      return fallo('inesperado', MENSAJE_INESPERADO)
    }
    ids = candidatos.ids
  }
  if (ids.length === 0) {
    return ok({ filas: [], siguiente: null, anterior: null })
  }
  const orden = ORDEN_DEL_PANEL.busqueda
  const { data, error } = await ordenarPorCursor(
    aplicarCursor(
      createClient()
        .rpc('leads_vista_por_ids', { p_leads: ids })
        .select(columnasDelPanel('busqueda')),
      cursor,
      orden,
    ),
    cursor,
    orden,
  ).limit(TAMANO_DE_VER_MAS + 1)
  return paginaDe(data, error, pedido)
}

export function leerClientesDelPanel(pedido: PedidoDelPanel): Promise<PaginaLeida> {
  return pedido.lista === 'busqueda' ? leerBusqueda(pedido) : leerMios(pedido)
}

// El catálogo (`leads_catalogos()`: los tipos con su clase y los orígenes, hasta 100, que el panel no usa) se lee una vez al abrir el panel y se recuerda un rato:
// dice el nombre del tipo de cada fila y, en una pestaña de clase, qué tipos son de esa clase.
const VIDA_DEL_CATALOGO_MS = 60_000
const memoriaDelCatalogo = memoriaDeLectura<CatalogosDeLead>(async () => {
  const { data, error } = await createClient().rpc('leads_catalogos')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const catalogos = catalogosDeLeadDesde(data)
  return catalogos ? ok(catalogos) : fallo('inesperado', MENSAJE_DE_LECTURA)
}, VIDA_DEL_CATALOGO_MS)

export const leerCatalogoDelPanel = () => memoriaDelCatalogo.leer()
