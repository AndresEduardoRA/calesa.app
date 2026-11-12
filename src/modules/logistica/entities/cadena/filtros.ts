import { z } from 'zod'
import {
  cumpleElMinimo,
  type EsquemaDeFiltros,
  type MinimoDeBusqueda,
  type ValoresDeFiltros,
} from '@/shared/lib/filtros'

// Los filtros de la cadena (6.03-1): la URL de `/logistica` los lleva y este archivo los vuelve lo que entiende `logistica_cadena()`. Puro: ninguna lectura. La URL conserva
// aparte `origen`, `fase` y `vehiculo`; `FilterShell` sólo toca las claves de este esquema.

export const CLAVE_DE_ORIGEN_DE_LA_CADENA = 'origen'
export const CLAVE_DE_FASE_DE_LA_CADENA = 'fase'
export const CLAVE_DE_BUSQUEDA_DE_LA_CADENA = 'q'
export const CLAVE_DE_DEMORADAS = 'demoradas'
export const CLAVE_DE_POR_APROBAR = 'por_aprobar'
export const CLAVE_DE_CONTENEDOR = 'contenedor'
export const CLAVE_DE_BOOKING = 'booking'
export const CLAVE_DE_NAVIERA = 'naviera'

const TODAS = 'todas'
const SI = 'si'

// Espejo de `_logistica_filtros` (`[[:alnum:]]{3}`): con menos de tres letras o dígitos seguidos la base ignora la búsqueda, así que la interfaz ni la manda.
export const MINIMO_DE_BUSQUEDA_DE_LA_CADENA: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: false,
  aviso: 'Escribe al menos 3 letras o números para buscar.',
}

// Lo mismo que acepta la RPC y nada más (con una clave de más responde 22023). `demoradas` y `por_aprobar` sólo existen con `true`: «no» no filtra.
export type FiltrosDeLaCadena = {
  q?: string
  demoradas?: true
  por_aprobar?: true
  contenedor?: string
  booking?: string
  naviera?: string
}

export type NavieraParaFiltrar = { id: string; nombre: string }

const LARGO_MAXIMO = 100

/**
 * El esquema de los filtros de la cadena. «Demoradas» y «Por aprobar» son una elección de dos valores y no un booleano: un «No» tri-estado no filtra y el chip diría lo contrario. «Naviera» sólo
 * se ofrece si hay al menos una.
 */
export function esquemaDeFiltrosDeLaCadena({
  navieras,
}: {
  navieras: readonly NavieraParaFiltrar[]
}): EsquemaDeFiltros {
  const deNaviera: EsquemaDeFiltros['filtros'] =
    navieras.length === 0
      ? []
      : [
          {
            tipo: 'eleccion',
            clave: CLAVE_DE_NAVIERA,
            etiqueta: 'Naviera',
            porDefecto: TODAS,
            opciones: [
              { valor: TODAS, etiqueta: 'Todas' },
              ...navieras.map((naviera) => ({ valor: naviera.id, etiqueta: naviera.nombre })),
            ],
          },
        ]
  return {
    busqueda: {
      clave: CLAVE_DE_BUSQUEDA_DE_LA_CADENA,
      etiqueta: 'Buscar por nombre, VIN o lote',
      marcador: 'Nombre, VIN o lote',
      minimo: MINIMO_DE_BUSQUEDA_DE_LA_CADENA,
    },
    filtros: [
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_DEMORADAS,
        etiqueta: 'Demora',
        porDefecto: TODAS,
        opciones: [
          { valor: TODAS, etiqueta: 'Todas' },
          { valor: SI, etiqueta: 'Sólo las demoradas' },
        ],
      },
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_POR_APROBAR,
        etiqueta: 'Documentos',
        porDefecto: TODAS,
        opciones: [
          { valor: TODAS, etiqueta: 'Todas' },
          { valor: SI, etiqueta: 'Sólo con documentos por aprobar' },
        ],
      },
      { tipo: 'texto', clave: CLAVE_DE_CONTENEDOR, etiqueta: 'Contenedor' },
      { tipo: 'texto', clave: CLAVE_DE_BOOKING, etiqueta: 'Booking' },
      ...deNaviera,
    ],
  }
}

function eleccion(valores: ValoresDeFiltros, clave: string): string | null {
  const valor = valores.porClave[clave]
  return valor?.tipo === 'eleccion' ? valor.valor : null
}

function texto(valores: ValoresDeFiltros, clave: string): string | null {
  const valor = valores.porClave[clave]
  if (valor?.tipo !== 'texto') return null
  const limpio = valor.texto.trim().slice(0, LARGO_MAXIMO)
  return limpio === '' ? null : limpio
}

/**
 * Lo que la URL, ya leída con el esquema, pide a `logistica_cadena()`: sólo lo que filtra. Una búsqueda que no alcanza el mínimo, un `naviera` que no es guid o un valor que no se ofrece se
 * descartan: una URL escrita a mano nunca produce un 22023.
 */
export function pedidoDeLaCadena(valores: ValoresDeFiltros): FiltrosDeLaCadena {
  const q = valores.busqueda.trim()
  const naviera = eleccion(valores, CLAVE_DE_NAVIERA)
  const contenedor = texto(valores, CLAVE_DE_CONTENEDOR)
  const booking = texto(valores, CLAVE_DE_BOOKING)
  return {
    ...(cumpleElMinimo(q, MINIMO_DE_BUSQUEDA_DE_LA_CADENA) ? { q: q.slice(0, LARGO_MAXIMO) } : {}),
    ...(eleccion(valores, CLAVE_DE_DEMORADAS) === SI ? { demoradas: true as const } : {}),
    ...(eleccion(valores, CLAVE_DE_POR_APROBAR) === SI ? { por_aprobar: true as const } : {}),
    ...(contenedor === null ? {} : { contenedor }),
    ...(booking === null ? {} : { booking }),
    ...(naviera !== null && z.guid().safeParse(naviera).success ? { naviera } : {}),
  }
}

/** ¿Alguno de los filtros de la cadena está filtrando? Para decir «ningún vehículo coincide con los filtros» y no «sin vehículos». */
export function cadenaFiltrada(filtros: FiltrosDeLaCadena): boolean {
  return Object.keys(filtros).length > 0
}
