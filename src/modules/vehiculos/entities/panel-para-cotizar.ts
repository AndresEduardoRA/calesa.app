// El panel del vehículo de la hoja de cotizar (`?panel=vehiculo`): elegir el vehículo de la cotización entre los de su origen, por
// «Últ. cotización» (los cotizados, del más reciente) o por «Cierre subasta» (las subastas vivas, la que cierra antes primero). Las dos
// listas van por cursor sobre la columna que las ordena (`OrdenDeCursor`) y las sostienen los índices del 4.14-1
// (`docs/RENDIMIENTO.md`, panel del vehículo).
import { z } from 'zod'
import type { OrdenDeCursor } from '@/shared/lib/paginacion'
import type { Vehiculo } from './vehiculo'

// «Cierre subasta» muestra también las que cerraron hace poco (P5 del 4.14-1): una subasta que cerró hace unas horas todavía se cotiza.
export const MARGEN_DEL_CIERRE_EN_HORAS = 24

// Desde cuándo lista «Cierre subasta»: ahora menos el margen, como ISO. Se calcula una vez al abrir el panel (con el reloj del
// navegador) y queda fijo mientras está abierto: ir y volver de página usa el mismo borde.
export function desdeDelCierre(ahora: Date): string {
  return new Date(ahora.getTime() - MARGEN_DEL_CIERRE_EN_HORAS * 3_600_000).toISOString()
}

export const LISTAS_DEL_PANEL = ['ultima', 'cierre'] as const
export type ListaDelPanel = (typeof LISTAS_DEL_PANEL)[number]

// La pestaña de `?lista=`: «Cierre subasta» sólo en un origen de subasta; otra cosa o nada, «Últ. cotización».
export function listaDelPanel(valor: string | null, esSubasta: boolean): ListaDelPanel {
  return valor === 'cierre' && esSubasta ? 'cierre' : 'ultima'
}

// La columna y el orden de cada lista: lo que leen `aplicarCursor()` y `ordenarPorCursor()`.
export const ORDEN_DEL_PANEL: Record<ListaDelPanel, OrdenDeCursor> = {
  ultima: { columna: 'cotizado_en', ascendente: false },
  cierre: { columna: 'cierre_subasta_en', ascendente: true },
}

// Lo que se pide de cada vehículo: lo que dibuja su tarjeta, con la miniatura de la portada embebida (`FILTRO_DE_PORTADA`).
export const COLUMNAS_DEL_PANEL =
  'id, numero, titulo, anio, lote, precio, cotizado_en, cierre_subasta_en, vehiculos_imagenes(ruta_miniatura)'

export type VehiculoDelPanel = {
  id: string
  numero: number
  titulo: string
  anio: number | null
  lote: string | null
  precio: number | null
  cotizadoEn: string | null
  cierreSubastaEn: string | null
  portadaRuta: string | null
}

const esquemaDelPanel = z.array(
  z.object({
    id: z.guid(),
    numero: z.number(),
    titulo: z.string(),
    anio: z.number().nullable(),
    lote: z.string().nullable(),
    precio: z.number().nullable(),
    cotizado_en: z.string().nullable(),
    cierre_subasta_en: z.string().nullable(),
    vehiculos_imagenes: z.array(z.object({ ruta_miniatura: z.string() })).catch([]),
  }),
)

// El instante por el que pagina cada lista; el filtro de la lectura garantiza que no es nulo.
export function instanteDelPanel(lista: ListaDelPanel, vehiculo: VehiculoDelPanel): string | null {
  return lista === 'ultima' ? vehiculo.cotizadoEn : vehiculo.cierreSubastaEn
}

// Las filas de una lista, en el orden en que llegaron. Una sin el instante de su lista (no debería: lo filtra la consulta) hace de la
// lectura un error (`null`), no una fila: el cursor no sabría por dónde seguir.
export function vehiculosDelPanelDesde(
  filas: unknown,
  lista: ListaDelPanel,
): VehiculoDelPanel[] | null {
  const vehiculos = esquemaDelPanel.parse(filas).map((fila) => ({
    id: fila.id,
    numero: fila.numero,
    titulo: fila.titulo,
    anio: fila.anio,
    lote: fila.lote,
    precio: fila.precio,
    cotizadoEn: fila.cotizado_en,
    cierreSubastaEn: fila.cierre_subasta_en,
    portadaRuta: fila.vehiculos_imagenes[0]?.ruta_miniatura ?? null,
  }))
  return vehiculos.every((vehiculo) => instanteDelPanel(lista, vehiculo) !== null)
    ? vehiculos
    : null
}

// El vehículo elegido, como lo dibujan la barra y el panel: lo que la página le pasa al navegador (sin los atributos).
export type VehiculoElegido = Pick<Vehiculo, 'id' | 'numero' | 'titulo' | 'lote' | 'portadaRuta'>

export function elegidoDesde(vehiculo: Vehiculo): VehiculoElegido {
  const { id, numero, titulo, lote, portadaRuta } = vehiculo
  return { id, numero, titulo, lote, portadaRuta }
}

// «#12 · Lote 4455» (sin lote, sólo el número).
export function referenciaDelVehiculo(vehiculo: { numero: number; lote: string | null }): string {
  const numero = `#${String(vehiculo.numero)}`
  return vehiculo.lote ? `${numero} · Lote ${vehiculo.lote}` : numero
}
