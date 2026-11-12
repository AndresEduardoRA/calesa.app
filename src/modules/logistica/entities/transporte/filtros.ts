import { z } from 'zod'
import {
  cumpleElMinimo,
  type DefFiltro,
  type EsquemaDeFiltros,
  type MinimoDeBusqueda,
  type OpcionDeFiltro,
  type ValoresDeFiltros,
} from '@/shared/lib/filtros'
import { tipoDeLaBaseDe, type VistaDeGrupos } from './paneles'

// Los filtros de `/logistica/embarques` (6.08-3): la URL los lleva y este archivo los vuelve el pedido que entiende `transporte_grupos()`. Puro: ninguna lectura. La URL conserva aparte
// `grupo` (la vista), `booking` o `contenedor` (el resumen abierto) y `cursor`; `FilterShell` sólo toca las claves de este esquema.

export const CLAVE_DE_NAVIERA_DEL_FILTRO = 'naviera'
export const CLAVE_DE_PUERTO_DE_ORIGEN = 'puerto_origen'
export const CLAVE_DE_PUERTO_DE_DESTINO = 'puerto_destino'
export const CLAVE_DE_EN_TRANSITO = 'en_transito'
export const CLAVE_DE_BUSQUEDA_DE_GRUPOS = 'q'

const TODOS = 'todos'
const SI = 'si'
const NO = 'no'

// Espejo de `_transporte_grupos_filtros` (`[A-Z0-9]{3}` tras quitar los espacios y pasar a mayúsculas): con menos la base responde 22023, así que la interfaz ni la manda.
export const MINIMO_DE_BUSQUEDA_DE_GRUPOS: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: false,
  aviso: 'Escribe al menos 3 letras o números para buscar.',
}

const TRES_SEGUIDOS = /[A-Za-z0-9]{3}/
const LARGO_MAXIMO = 60

// Lo mismo que acepta la RPC y nada más (con una clave de más responde 22023). `en_transito` es un booleano en la base: «sí» (sin arribo) y «no» (con arribo) filtran, «todos» no manda nada.
export type FiltrosDeGrupos = {
  naviera?: string
  puerto_origen?: string
  puerto_destino?: string
  en_transito?: boolean
  prefijo?: string
}

export type PedidoDeGrupos = {
  tipo: 'booking' | 'contenedor'
  filtros: FiltrosDeGrupos
  // El `siguiente` opaco de la página anterior (un uuid); nulo = la primera página.
  desde: string | null
}

export type ElementoDelFiltro = { id: string; nombre: string; activo: boolean }

function eleccionDe(
  clave: string,
  etiqueta: string,
  todos: string,
  elementos: readonly ElementoDelFiltro[],
): DefFiltro[] {
  const opciones: OpcionDeFiltro[] = elementos
    .filter((e) => e.activo)
    .map((e) => ({ valor: e.id, etiqueta: e.nombre }))
  // Sin opciones el filtro no se dibuja: un selector que sólo dice «Todas» no filtra nada.
  return opciones.length === 0
    ? []
    : [
        {
          tipo: 'eleccion',
          clave,
          etiqueta,
          porDefecto: TODOS,
          opciones: [{ valor: TODOS, etiqueta: todos }, ...opciones],
        },
      ]
}

/** El esquema de los filtros de la lista: naviera, puerto de origen y de destino (de los catálogos), «En tránsito» y la búsqueda por clave según la vista. */
export function esquemaDeFiltrosDeGrupos(
  vista: VistaDeGrupos,
  catalogos: { navieras: readonly ElementoDelFiltro[]; puertos: readonly ElementoDelFiltro[] },
): EsquemaDeFiltros {
  const que = vista === 'contenedores' ? 'contenedor' : 'booking'
  return {
    busqueda: {
      clave: CLAVE_DE_BUSQUEDA_DE_GRUPOS,
      etiqueta: `Buscar por ${que}`,
      marcador: que === 'booking' ? 'Booking' : 'Contenedor',
      minimo: MINIMO_DE_BUSQUEDA_DE_GRUPOS,
    },
    filtros: [
      ...eleccionDe(CLAVE_DE_NAVIERA_DEL_FILTRO, 'Naviera', 'Todas', catalogos.navieras),
      ...eleccionDe(CLAVE_DE_PUERTO_DE_ORIGEN, 'Puerto de origen', 'Todos', catalogos.puertos),
      ...eleccionDe(CLAVE_DE_PUERTO_DE_DESTINO, 'Puerto de destino', 'Todos', catalogos.puertos),
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_EN_TRANSITO,
        etiqueta: 'Estado',
        porDefecto: TODOS,
        opciones: [
          { valor: TODOS, etiqueta: 'Todos' },
          { valor: SI, etiqueta: 'En tránsito' },
          { valor: NO, etiqueta: 'Ya llegaron' },
        ],
      },
    ],
  }
}

function eleccion(valores: ValoresDeFiltros, clave: string): string | null {
  const valor = valores.porClave[clave]
  return valor?.tipo === 'eleccion' ? valor.valor : null
}

function guid(valor: string | null): string | null {
  return valor !== null && z.guid().safeParse(valor).success ? valor : null
}

/**
 * Lo que la URL, ya leída con el esquema, pide a `transporte_grupos()`. Un uuid que no lo es, una búsqueda sin tres letras o números seguidos, un estado ajeno o un cursor que no es un uuid
 * se descartan: una URL escrita a mano nunca produce un 22023. `desde` es el cursor tal cual de la página anterior.
 */
export function pedidoDeGrupos(
  valores: ValoresDeFiltros,
  { vista, desde }: { vista: VistaDeGrupos; desde: string | null },
): PedidoDeGrupos {
  const q = valores.busqueda.trim()
  const naviera = guid(eleccion(valores, CLAVE_DE_NAVIERA_DEL_FILTRO))
  const origen = guid(eleccion(valores, CLAVE_DE_PUERTO_DE_ORIGEN))
  const destino = guid(eleccion(valores, CLAVE_DE_PUERTO_DE_DESTINO))
  const transito = eleccion(valores, CLAVE_DE_EN_TRANSITO)
  const filtros: FiltrosDeGrupos = {
    ...(naviera !== null ? { naviera } : {}),
    ...(origen !== null ? { puerto_origen: origen } : {}),
    ...(destino !== null ? { puerto_destino: destino } : {}),
    ...(transito === SI ? { en_transito: true } : transito === NO ? { en_transito: false } : {}),
    ...(cumpleElMinimo(q, MINIMO_DE_BUSQUEDA_DE_GRUPOS) && TRES_SEGUIDOS.test(q)
      ? { prefijo: q.slice(0, LARGO_MAXIMO) }
      : {}),
  }
  return { tipo: tipoDeLaBaseDe(vista), filtros, desde: guid(desde) }
}

/** ¿Alguno de los filtros está filtrando? Para decir «ningún contenedor coincide» y no «todavía no hay». */
export function gruposFiltrados(filtros: FiltrosDeGrupos): boolean {
  return Object.keys(filtros).length > 0
}
