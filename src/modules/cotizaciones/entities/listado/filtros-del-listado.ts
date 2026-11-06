// Los filtros del listado `/cotizaciones` (`docs/UX.md` › «Cotizaciones»): qué ofrece su barra y qué pide cada URL a `cotizaciones_listado()`. Puro: la página
// lee la URL con `leerFiltros()` y este archivo la vuelve un pedido. Un valor que no corresponde se descarta al leer (nunca un error).
import { z } from 'zod'
import type { EsquemaDeFiltros, OpcionDeFiltro, ValoresDeFiltros } from '@/shared/lib/filtros'
import type { Cursor } from '@/shared/lib/paginacion'
import type { Permisos } from '@/shared/lib/permisos'
import type { ClaseDeCotizacion, PedidoDelListado } from './listado'
import { ETIQUETA_DE_CLASE } from '../historial-del-vehiculo'
import { origenesParaCotizar } from '../origenes-para-cotizar'
import { CLAVE_DE_ORIGEN } from '../ruta-de-la-hoja'

export const CLAVE_DE_CLASE = 'clase'
export const CLAVE_DE_CUALES = 'cuales'

// El valor que no filtra de cada elección: no se escribe en la URL ni es un chip.
const TODOS = 'todos'
const TODAS = 'todas'
const MIAS = 'mias'

type OrigenParaFiltrar = { id: string; nombre: string }

// «Origen» sólo si hay dos o más donde elegir; «Clase» y «Cuáles» siempre. «Cuáles» es una elección y no un booleano porque la base no tiene «las que no creé yo».
export function esquemaDelListado(origenes: readonly OrigenParaFiltrar[]): EsquemaDeFiltros {
  const clases: OpcionDeFiltro[] = [
    { valor: TODAS, etiqueta: 'Todas' },
    { valor: 'preventa', etiqueta: ETIQUETA_DE_CLASE.preventa },
    { valor: 'final', etiqueta: ETIQUETA_DE_CLASE.final },
  ]
  return {
    busqueda: null,
    filtros: [
      ...(origenes.length >= 2
        ? [
            {
              tipo: 'eleccion',
              clave: CLAVE_DE_ORIGEN,
              etiqueta: 'Origen',
              porDefecto: TODOS,
              opciones: [
                { valor: TODOS, etiqueta: 'Todos' },
                ...origenes.map((origen) => ({ valor: origen.id, etiqueta: origen.nombre })),
              ],
            } as const,
          ]
        : []),
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_CLASE,
        etiqueta: 'Clase',
        porDefecto: TODAS,
        opciones: clases,
      },
      {
        tipo: 'eleccion',
        clave: CLAVE_DE_CUALES,
        etiqueta: 'Cuáles',
        ayuda: 'Mías: las que creaste tú.',
        porDefecto: TODAS,
        opciones: [
          { valor: TODAS, etiqueta: 'Todas' },
          { valor: MIAS, etiqueta: 'Mías' },
        ],
      },
    ],
  }
}

function eleccion(valores: ValoresDeFiltros, clave: string): string | null {
  const valor = valores.porClave[clave]
  return valor?.tipo === 'eleccion' ? valor.valor : null
}

// Lo que pide la URL, ya leída con el esquema: el origen sólo es uno de los que se ofrecen, la clase una de las dos y «Mías» la única que no es el valor por defecto.
export function pedidoDelListado(
  valores: ValoresDeFiltros,
  // `vehiculo` y `lead` son el texto de `?vehiculo=` y `?lead=` tal como llegó: sólo vale un guid. No son filtros del esquema (ni chip, ni los borra «Limpiar»).
  resto: {
    cursor: Cursor | null
    tamano: number
    vehiculo?: string | undefined
    lead?: string | undefined
  },
): PedidoDelListado {
  const origenId = eleccion(valores, CLAVE_DE_ORIGEN)
  const clase = eleccion(valores, CLAVE_DE_CLASE)
  const vehiculo = z.guid().safeParse(resto.vehiculo)
  const lead = z.guid().safeParse(resto.lead)
  return {
    ...(origenId === null ? {} : { origenId }),
    ...(clase === 'preventa' || clase === 'final'
      ? { clase: clase satisfies ClaseDeCotizacion }
      : {}),
    ...(eleccion(valores, CLAVE_DE_CUALES) === MIAS ? { mias: true } : {}),
    ...(vehiculo.success ? { vehiculoId: vehiculo.data } : {}),
    ...(lead.success ? { leadId: lead.data } : {}),
    cursor: resto.cursor,
    tamano: resto.tamano,
  }
}

// El origen de «Nueva cotización»: el del filtro si ahí se cotiza (activo, con `crear` y `ver`); si no, el primero donde sí. Nulo si en ninguno: el botón no está.
export function origenParaNueva<O extends { id: string; activo: boolean }>(
  permisos: Permisos,
  origenes: readonly O[],
  elegido: string | undefined,
): string | null {
  const donde = origenesParaCotizar(permisos, origenes)
  return donde.find((origen) => origen.id === elegido)?.id ?? donde[0]?.id ?? null
}
