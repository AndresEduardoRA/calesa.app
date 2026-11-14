// La columna «Precio» del inventario. En un origen de subasta cuyo layout trae la puja (el campo que apibara llena con
// `pricing.current_bid_usd`), esa columna muestra la puja y se llama «Puja actual»: es lo que se mira mientras la subasta corre.
// La puja nunca se hace pasar por el precio del vehículo: lleva su nombre, su moneda (USD) y, cuando la subasta terminó o se
// vendió, la marca «final».
import type { EstadoDeSubasta } from './subasta'

export const CLAVE_APIBARA_DE_LA_PUJA = 'pricing.current_bid_usd'
export const MONEDA_DE_LA_PUJA = 'USD'
export const AYUDA_DE_LA_PUJA = 'Es la puja de la subasta, no el precio del vehículo'

type CampoConApibara = { clave: string; activo: boolean; claveApibara?: string | null }

export type ColumnaDePrecio = { tipo: 'precio' } | { tipo: 'puja'; clave: string }

export function columnaDePrecio(
  esSubasta: boolean,
  campos: readonly CampoConApibara[],
): ColumnaDePrecio {
  if (!esSubasta) return { tipo: 'precio' }
  const puja = campos.find(
    (campo) => campo.activo && campo.claveApibara === CLAVE_APIBARA_DE_LA_PUJA,
  )
  return puja ? { tipo: 'puja', clave: puja.clave } : { tipo: 'precio' }
}

export function encabezadoDePrecio(columna: ColumnaDePrecio): string {
  return columna.tipo === 'puja' ? 'Puja actual' : 'Precio'
}

export type PrecioDeLaFila =
  { tipo: 'precio'; valor: number } | { tipo: 'puja'; valor: number; final: boolean }

type DeLaFila = {
  precio: number | null
  atributos: Readonly<Record<string, unknown>>
  estadoSubasta: EstadoDeSubasta | null
}

function numeroDe(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  if (typeof valor === 'string' && valor.trim() !== '') {
    const numero = Number(valor)
    return Number.isFinite(numero) ? numero : null
  }
  return null
}

// null = no hay nada que mostrar (la celda dice «—»). Sin puja en un origen de subasta no se muestra el precio en su lugar.
export function precioDeLaFila(
  vehiculo: DeLaFila,
  columna: ColumnaDePrecio,
): PrecioDeLaFila | null {
  if (columna.tipo === 'precio') {
    return vehiculo.precio === null ? null : { tipo: 'precio', valor: vehiculo.precio }
  }
  const valor = numeroDe(vehiculo.atributos[columna.clave])
  if (valor === null) return null
  const final = vehiculo.estadoSubasta === 'terminada' || vehiculo.estadoSubasta === 'vendida'
  return { tipo: 'puja', valor, final }
}

// El rótulo completo, para la tarjeta: ahí no hay encabezado de columna que lo diga.
export function rotuloDeLaPuja(final: boolean): string {
  return final ? 'Puja final' : 'Puja actual'
}
