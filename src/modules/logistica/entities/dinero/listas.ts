import { z } from 'zod'
import type { EsquemaDeFiltros, OpcionDeFiltro, ValoresDeFiltros } from '@/shared/lib/filtros'
import {
  TAMANO_DE_PAGINA_POR_DEFECTO,
  armarPaginaPor,
  codificarCursor,
  type Cursor,
  type Pagina,
} from '@/shared/lib/paginacion'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'

// Las listas de `/logistica/gastos` (6.11-3): los gastos y los pagos que quien mira puede ver, por cursor `(fecha, id)` y con sus filtros en la URL. Puro: la página lee la URL y
// este archivo la vuelve el pedido que entienden `gastos_listar()` y `pagos_listar()`. Ninguna suma: lo que la lista muestra es lo que la base devolvió, fila por fila.

export type VistaDeDinero = 'gastos' | 'pagos'

export const CLAVE_DE_VISTA = 'ver'
export const CLAVE_DE_ORIGEN_DE_DINERO = 'origen'
export const CLAVE_DE_CATEGORIA = 'categoria'
export const CLAVE_DE_CONFIRMACION = 'confirmacion'
export const CLAVE_DE_FECHA = 'fecha'

const TODOS = 'todos'
const TODAS = 'todas'
const SIN_CONFIRMAR = 'sin_confirmar'

// ——— Filas ———

export type FilaDeGasto = {
  id: string
  vehiculoId: string
  vehiculoTitulo: string
  origenId: string
  categoriaId: string
  categoriaNombre: string
  moneda: string
  monto: number
  tipoCambioAplicado: number | null
  montoBase: number
  fecha: string
  proveedor: string | null
  comprobanteRuta: string | null
  loteId: string | null
  actualizadoEn: string
}

export type FilaDePago = {
  id: string
  vehiculoId: string
  vehiculoTitulo: string
  origenId: string
  concepto: string
  moneda: string
  monto: number
  tipoCambioAplicado: number | null
  montoBase: number
  metodo: string | null
  fecha: string
  confirmado: boolean
  confirmadoPor: string | null
  confirmadoEn: string | null
  comprobanteRuta: string | null
  actualizadoEn: string
}

const esquemaDeFilaDeGasto = z.object({
  id: z.guid(),
  vehiculo_id: z.guid(),
  vehiculo_titulo: z.string(),
  origen_id: z.guid(),
  categoria_id: z.guid(),
  categoria_nombre: z.string(),
  moneda: z.string(),
  monto: z.number(),
  tipo_cambio_aplicado: z.number().nullable(),
  monto_base: z.number(),
  fecha: z.string(),
  proveedor: z.string().nullable(),
  comprobante_ruta: z.string().nullable(),
  lote_id: z.guid().nullable(),
  actualizado_en: z.string(),
})

const esquemaDeFilaDePago = z.object({
  id: z.guid(),
  vehiculo_id: z.guid(),
  vehiculo_titulo: z.string(),
  origen_id: z.guid(),
  concepto: z.string(),
  moneda: z.string(),
  monto: z.number(),
  tipo_cambio_aplicado: z.number().nullable(),
  monto_base: z.number(),
  metodo: z.string().nullable(),
  fecha: z.string(),
  confirmado: z.boolean(),
  confirmado_por: z.guid().nullable(),
  confirmado_en: z.string().nullable(),
  comprobante_ruta: z.string().nullable(),
  actualizado_en: z.string(),
})

/** Lo que devolvió `gastos_listar()` como filas; nulo si alguna no tiene la forma esperada (la infra lo vuelve un error: nunca se descarta en silencio). */
export function filasDeGastoDesde(datos: unknown): FilaDeGasto[] | null {
  const leido = z.array(esquemaDeFilaDeGasto).safeParse(datos)
  if (!leido.success) {
    return null
  }
  return leido.data.map((g) => ({
    id: g.id,
    vehiculoId: g.vehiculo_id,
    vehiculoTitulo: g.vehiculo_titulo,
    origenId: g.origen_id,
    categoriaId: g.categoria_id,
    categoriaNombre: g.categoria_nombre,
    moneda: g.moneda,
    monto: g.monto,
    tipoCambioAplicado: g.tipo_cambio_aplicado,
    montoBase: g.monto_base,
    fecha: g.fecha,
    proveedor: g.proveedor,
    comprobanteRuta: g.comprobante_ruta,
    loteId: g.lote_id,
    actualizadoEn: g.actualizado_en,
  }))
}

/** Lo que devolvió `pagos_listar()` como filas; nulo si alguna no tiene la forma esperada. No trae el nombre de quien confirmó: ése está en el sello del panel de la unidad. */
export function filasDePagoDesde(datos: unknown): FilaDePago[] | null {
  const leido = z.array(esquemaDeFilaDePago).safeParse(datos)
  if (!leido.success) {
    return null
  }
  return leido.data.map((p) => ({
    id: p.id,
    vehiculoId: p.vehiculo_id,
    vehiculoTitulo: p.vehiculo_titulo,
    origenId: p.origen_id,
    concepto: p.concepto,
    moneda: p.moneda,
    monto: p.monto,
    tipoCambioAplicado: p.tipo_cambio_aplicado,
    montoBase: p.monto_base,
    metodo: p.metodo,
    fecha: p.fecha,
    confirmado: p.confirmado,
    confirmadoPor: p.confirmado_por,
    confirmadoEn: p.confirmado_en,
    comprobanteRuta: p.comprobante_ruta,
    actualizadoEn: p.actualizado_en,
  }))
}

// ——— Vista y filtros ———

const PERMISO_DE_VISTA: Record<VistaDeDinero, ClavePermiso> = {
  gastos: 'logistica.gastos.ver',
  pagos: 'logistica.pagos.ver',
}

/** Las vistas que la persona puede ver, en el orden en que se ofrecen. */
export function vistasPermitidas(permisos: Permisos): VistaDeDinero[] {
  return (['gastos', 'pagos'] as const).filter((vista) => puede(permisos, PERMISO_DE_VISTA[vista]))
}

/** La vista de `?ver=`: la pedida si la persona puede verla; si no, la que sí puede; ninguna, nulo (la página dice «sin permiso»). */
export function vistaDe(texto: string | undefined, permisos: Permisos): VistaDeDinero | null {
  const permitidas = vistasPermitidas(permisos)
  const pedida = permitidas.find((vista) => vista === texto)
  return pedida ?? permitidas[0] ?? null
}

export const ETIQUETA_DE_VISTA: Record<VistaDeDinero, string> = {
  gastos: 'Gastos',
  pagos: 'Pagos',
}

type OrigenParaFiltrar = { id: string; nombre: string }
type CategoriaParaFiltrar = { id: string; nombre: string }

// «Origen» sólo si hay dos o más donde elegir; «Categoría» sólo en gastos y «Confirmación» sólo en pagos; «Fecha» siempre. «Confirmación» es una elección y no un booleano porque
// la base no tiene «sólo confirmados».
export function esquemaDeFiltrosDeDinero(
  vista: VistaDeDinero,
  {
    origenes,
    categorias,
  }: { origenes: readonly OrigenParaFiltrar[]; categorias: readonly CategoriaParaFiltrar[] },
): EsquemaDeFiltros {
  const deOrigen: EsquemaDeFiltros['filtros'] =
    origenes.length >= 2
      ? [
          {
            tipo: 'eleccion',
            clave: CLAVE_DE_ORIGEN_DE_DINERO,
            etiqueta: 'Origen',
            porDefecto: TODOS,
            opciones: [
              { valor: TODOS, etiqueta: 'Todos' },
              ...origenes.map((origen) => ({ valor: origen.id, etiqueta: origen.nombre })),
            ],
          },
        ]
      : []
  const propio: EsquemaDeFiltros['filtros'] =
    vista === 'gastos'
      ? [
          {
            tipo: 'eleccion',
            clave: CLAVE_DE_CATEGORIA,
            etiqueta: 'Categoría',
            porDefecto: TODAS,
            opciones: [
              { valor: TODAS, etiqueta: 'Todas' },
              ...categorias.map((categoria): OpcionDeFiltro => ({
                valor: categoria.id,
                etiqueta: categoria.nombre,
              })),
            ],
          },
        ]
      : [
          {
            tipo: 'eleccion',
            clave: CLAVE_DE_CONFIRMACION,
            etiqueta: 'Confirmación',
            porDefecto: TODOS,
            opciones: [
              { valor: TODOS, etiqueta: 'Todos' },
              { valor: SIN_CONFIRMAR, etiqueta: 'Sin confirmar' },
            ],
          },
        ]
  return {
    busqueda: null,
    filtros: [
      ...deOrigen,
      ...propio,
      { tipo: 'rango_fecha', clave: CLAVE_DE_FECHA, etiqueta: 'Fecha' },
    ],
  }
}

function eleccion(valores: ValoresDeFiltros, clave: string): string | null {
  const valor = valores.porClave[clave]
  return valor?.tipo === 'eleccion' ? valor.valor : null
}

// Lo que `p_filtros` lleva: sólo las claves que esa RPC acepta (con una de más la base responde 22023).
export type FiltrosDeDinero = {
  origen?: string
  categoria?: string
  desde?: string
  hasta?: string
  sin_confirmar?: true
}

export type PedidoDeDinero = {
  filtros: FiltrosDeDinero
  // El cursor de una página que sigue; nunca uno hacia atrás (la RPC sólo camina hacia adelante).
  cursor: { fecha: string; id: string } | null
}

// Una elección que es un id (un origen o una categoría): lo que no es un guid no llega a la base.
function idElegido(valores: ValoresDeFiltros, clave: string): string | null {
  const valor = eleccion(valores, clave)
  return valor !== null && z.guid().safeParse(valor).success ? valor : null
}

function rangoDeFechas(valores: ValoresDeFiltros): { desde?: string; hasta?: string } {
  const fecha = valores.porClave[CLAVE_DE_FECHA]
  if (fecha?.tipo !== 'rango_fecha') {
    return {}
  }
  return {
    ...(fecha.desde ? { desde: fecha.desde } : {}),
    ...(fecha.hasta ? { hasta: fecha.hasta } : {}),
  }
}

// Lo propio de cada vista: la categoría de los gastos y «sin confirmar» de los pagos.
function filtrosDeLaVista(vista: VistaDeDinero, valores: ValoresDeFiltros): FiltrosDeDinero {
  if (vista === 'gastos') {
    const categoria = idElegido(valores, CLAVE_DE_CATEGORIA)
    return categoria === null ? {} : { categoria }
  }
  return eleccion(valores, CLAVE_DE_CONFIRMACION) === SIN_CONFIRMAR ? { sin_confirmar: true } : {}
}

/**
 * Lo que pide la URL a `gastos_listar()` o `pagos_listar()`, ya leída con el esquema. Un filtro de la otra vista, un valor que no se ofrece o un cursor hacia atrás se descartan:
 * una URL escrita a mano nunca produce un 22023.
 */
export function pedidoDeDinero(
  vista: VistaDeDinero,
  valores: ValoresDeFiltros,
  { cursor }: { cursor: Cursor | null },
): PedidoDeDinero {
  const origen = idElegido(valores, CLAVE_DE_ORIGEN_DE_DINERO)
  const filtros: FiltrosDeDinero = {
    ...(origen === null ? {} : { origen }),
    ...filtrosDeLaVista(vista, valores),
    ...rangoDeFechas(valores),
  }
  return { filtros, cursor: cursor?.sentido === 'siguiente' ? deLaFecha(cursor) : null }
}

/** `/logistica/gastos?ver=…&origen=…`: el enlace de «Ver todos en Gastos» desde los huecos de una unidad. */
export function rutaDeLaLista({
  vista,
  origenId,
}: {
  vista: VistaDeDinero
  origenId?: string | undefined
}): string {
  const parametros = new URLSearchParams({ [CLAVE_DE_VISTA]: vista })
  if (origenId) {
    parametros.set(CLAVE_DE_ORIGEN_DE_DINERO, origenId)
  }
  return `${RUTAS.gastosDeLogistica}?${parametros.toString()}`
}

// ——— Cursor de fecha ———

const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/

// `(fecha, id)` viaja como un instante a medianoche UTC para pasar `leerCursor()`; la infra manda a la base sólo la fecha.
export function cursorDeFila(fila: { fecha: string; id: string }): string {
  return codificarCursor({ instante: `${fila.fecha}T00:00:00Z`, id: fila.id, sentido: 'siguiente' })
}

/** La `fecha` y el `id` de un cursor de `cursorDeFila()`; nulo si el instante no es una medianoche UTC (un cursor de otra lista). */
export function deLaFecha(cursor: Cursor): { fecha: string; id: string } | null {
  const fecha = cursor.instante.slice(0, 10)
  if (!SOLO_FECHA.test(fecha) || cursor.instante !== `${fecha}T00:00:00Z`) {
    return null
  }
  return { fecha, id: cursor.id }
}

/** La página que se muestra de lo leído (hasta una fila más que el tamaño). Sólo «siguiente»: `anterior` es siempre nulo. */
export function paginaDeDinero<Fila extends { id: string; fecha: string }>(
  leidas: readonly Fila[],
  cursor: Cursor | null,
): Pagina<Fila> {
  const pagina = armarPaginaPor(
    leidas,
    TAMANO_DE_PAGINA_POR_DEFECTO,
    cursor,
    (fila) => `${fila.fecha}T00:00:00Z`,
  )
  return { ...pagina, anterior: null }
}
