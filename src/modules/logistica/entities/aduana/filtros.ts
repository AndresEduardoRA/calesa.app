import { z } from 'zod'
import {
  cumpleElMinimo,
  type EsquemaDeFiltros,
  type MinimoDeBusqueda,
  type ValoresDeFiltros,
} from '@/shared/lib/filtros'
import {
  TAMANO_DE_PAGINA_POR_DEFECTO,
  armarPagina,
  type Cursor,
  type Pagina,
} from '@/shared/lib/paginacion'
import { CANALES_DE_AFORO, esCanalDeAforo, textoDelCanal, type CanalDeAforo } from './declaracion'

// Los filtros de `/logistica/aduana` (6.09-1): la URL los lleva y este archivo los vuelve el pedido que entiende `declaraciones_listar()`. Puro: ninguna lectura. La URL conserva
// aparte `declaracion` (el resumen abierto) y `panel`; `FilterShell` sólo toca las claves de este esquema.

export const CLAVE_DE_CANAL = 'canal'
export const CLAVE_DE_PAGADA = 'pagada'
export const CLAVE_DE_BUSQUEDA_DE_ADUANA = 'q'

const TODOS = 'todos'
const SI = 'si'
const NO = 'no'

// Espejo de `_declaraciones_filtros` (`[[:alnum:]]{3}`): con menos de tres letras o dígitos seguidos la base responde 22023, así que la interfaz ni la manda.
export const MINIMO_DE_BUSQUEDA_DE_ADUANA: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: false,
  aviso: 'Escribe al menos 3 letras o números para buscar.',
}

// Lo mismo que acepta la RPC y nada más (con una clave de más responde 22023). `pagada` es un booleano en la base: «sí» y «no» filtran, «todos» no manda nada.
export type FiltrosDeAduana = {
  canal?: CanalDeAforo
  pagada?: boolean
  q?: string
}

export type PedidoDeAduana = {
  filtros: FiltrosDeAduana
  // El cursor de una página que sigue `(creado_en, id)`; nunca uno hacia atrás (la RPC sólo camina hacia adelante).
  cursor: { desde: string; id: string } | null
}

const LARGO_MAXIMO = 60

/** El esquema de los filtros de la lista: «Canal» (los de la base) y «Pagada» (una elección de tres: un «No» tri-estado no filtraría), y la búsqueda por número. */
export function esquemaDeFiltrosDeAduana(): EsquemaDeFiltros {
  return {
    busqueda: {
      clave: CLAVE_DE_BUSQUEDA_DE_ADUANA,
      etiqueta: 'Buscar por número de declaración',
      marcador: 'Número de declaración',
      minimo: MINIMO_DE_BUSQUEDA_DE_ADUANA,
    },
    filtros: [
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_CANAL,
        etiqueta: 'Canal',
        porDefecto: TODOS,
        opciones: [
          { valor: TODOS, etiqueta: 'Todos' },
          ...CANALES_DE_AFORO.map((canal) => ({ valor: canal, etiqueta: textoDelCanal(canal) })),
        ],
      },
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_PAGADA,
        etiqueta: 'Tributos',
        porDefecto: TODOS,
        opciones: [
          { valor: TODOS, etiqueta: 'Todas' },
          { valor: SI, etiqueta: 'Pagadas' },
          { valor: NO, etiqueta: 'Con tributos pendientes' },
        ],
      },
    ],
  }
}

function eleccion(valores: ValoresDeFiltros, clave: string): string | null {
  const valor = valores.porClave[clave]
  return valor?.tipo === 'eleccion' ? valor.valor : null
}

/**
 * Lo que la URL, ya leída con el esquema, pide a `declaraciones_listar()`. Una búsqueda que no alcanza el mínimo, un canal que no existe o un cursor hacia atrás se descartan: una URL
 * escrita a mano nunca produce un 22023.
 */
export function pedidoDeAduana(
  valores: ValoresDeFiltros,
  { cursor }: { cursor: Cursor | null },
): PedidoDeAduana {
  const q = valores.busqueda.trim()
  const canal = eleccion(valores, CLAVE_DE_CANAL)
  const pagada = eleccion(valores, CLAVE_DE_PAGADA)
  const filtros: FiltrosDeAduana = {
    ...(canal !== null && esCanalDeAforo(canal) ? { canal } : {}),
    ...(pagada === SI ? { pagada: true } : pagada === NO ? { pagada: false } : {}),
    ...(cumpleElMinimo(q, MINIMO_DE_BUSQUEDA_DE_ADUANA) ? { q: q.slice(0, LARGO_MAXIMO) } : {}),
  }
  return {
    filtros,
    cursor:
      cursor?.sentido === 'siguiente' && z.guid().safeParse(cursor.id).success
        ? { desde: cursor.instante, id: cursor.id }
        : null,
  }
}

/** ¿Alguno de los filtros está filtrando? Para decir «ninguna declaración coincide» y no «todavía no hay». */
export function aduanaFiltrada(filtros: FiltrosDeAduana): boolean {
  return Object.keys(filtros).length > 0
}

/** La página que se muestra de lo leído (hasta una fila más que el tamaño). Sólo «siguiente»: la base camina hacia adelante, así que `anterior` es siempre nulo. */
export function paginaDeAduana<Fila extends { id: string; creadoEn: string }>(
  leidas: readonly Fila[],
): Pagina<Fila> {
  return { ...armarPagina(leidas, TAMANO_DE_PAGINA_POR_DEFECTO, null), anterior: null }
}
