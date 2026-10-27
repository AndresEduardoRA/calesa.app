// Monedas y tipos de cambio nombrados (oficial, paralelo…). Hay un solo valor vigente por clave:
// cambiarlo pisa el anterior y el historial lo guarda un trigger. Las cotizaciones guardadas no
// se mueven: cada una congeló los que usó.
import type { Tables } from '@/shared/types/database.types'
import { formatearParaEditar } from '@/shared/lib/formato'

export type Moneda = {
  codigo: string
  nombre: string
  simbolo: string
  decimales: number
  activa: boolean
  // ISO. La versión de la moneda.
  actualizadoEn: string
}

export type TipoCambio = {
  id: string
  // Como lo nombran las fórmulas («oficial»). No cambia después de crearlo.
  clave: string
  nombre: string
  // Una unidad de `monedaDe` vale `valor` de `monedaA`.
  monedaDe: string
  monedaA: string
  valor: number
  // El que se usa cuando no se elige otro entre esas dos monedas.
  esDefault: boolean
  activo: boolean
  // ISO. La versión del tipo de cambio.
  actualizadoEn: string
}

export type CambioDeValor = {
  id: number
  // null en el primero: nació con ese valor.
  valorAnterior: number | null
  valorNuevo: number
  // El nombre de quien lo cambió, o null si fue el sistema o la persona ya no está a la vista.
  cambiadoPor: string | null
  cambiadoEn: string
}

export function monedasDesde(filas: readonly Tables<'monedas'>[]): Moneda[] {
  return filas.map((fila) => ({
    codigo: fila.codigo,
    nombre: fila.nombre,
    simbolo: fila.simbolo,
    decimales: fila.decimales,
    activa: fila.activa,
    actualizadoEn: fila.actualizado_en,
  }))
}

export function tiposCambioDesde(filas: readonly Tables<'tipos_cambio'>[]): TipoCambio[] {
  return filas.map((fila) => ({
    id: fila.id,
    clave: fila.clave,
    nombre: fila.nombre,
    monedaDe: fila.moneda_de,
    monedaA: fila.moneda_a,
    valor: fila.valor,
    esDefault: fila.es_default,
    activo: fila.activo,
    actualizadoEn: fila.actualizado_en,
  }))
}

type FilaDeHistorial = Pick<
  Tables<'tipos_cambio_historial'>,
  'id' | 'valor_anterior' | 'valor_nuevo' | 'cambiado_por' | 'cambiado_en'
>

// Cuántos cambios del historial se ven: la lectura pide uno de más y, si lo hay, el historial lo dice (cierre 1).
export const CAMBIOS_A_LA_VISTA = 30

// El historial de un tipo de cambio, con el nombre de quien hizo cada cambio (`nombres`: id de la
// persona → cómo se la muestra).
export function historialDesde(
  filas: readonly FilaDeHistorial[],
  nombres: ReadonlyMap<string, string>,
): CambioDeValor[] {
  return filas.map((fila) => ({
    id: fila.id,
    valorAnterior: fila.valor_anterior,
    valorNuevo: fila.valor_nuevo,
    cambiadoPor: fila.cambiado_por ? (nombres.get(fila.cambiado_por) ?? null) : null,
    cambiadoEn: fila.cambiado_en,
  }))
}

// Los que se pueden usar hoy, con el por defecto adelante (es el que muestra la barra superior).
export function vigentes(tipos: readonly TipoCambio[]): TipoCambio[] {
  return tipos
    .filter((tipo) => tipo.activo)
    .sort((uno, otro) => Number(otro.esDefault) - Number(uno.esDefault))
}

const LARGO_MAXIMO_CLAVE = 31

// La clave de un tipo de cambio a partir de su nombre, con la forma que exige la base
// (`^[a-z][a-z0-9_]{1,30}$`). «Banco Unión» → `banco_union`. null si del nombre no sale una.
export function claveDeTipoCambio(nombre: string): string | null {
  const clave = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .slice(0, LARGO_MAXIMO_CLAVE)
    .replace(/_+$/, '')
  return clave.length >= 2 ? clave : null
}

const DECIMALES_MINIMOS = 2
const DECIMALES_MAXIMOS = 6

// Con cuántos decimales se muestra un valor: los que tiene, entre 2 y 6 (la base guarda 6).
// 6.96 → 2; 12.405 → 3; 0.000145 → 6.
export function decimalesDeValor(valor: number): number {
  for (let decimales = DECIMALES_MINIMOS; decimales < DECIMALES_MAXIMOS; decimales++) {
    const factor = 10 ** decimales
    if (Math.abs(Math.round(valor * factor) / factor - valor) < 1e-9) {
      return decimales
    }
  }
  return DECIMALES_MAXIMOS
}

// El valor guardado como se abre para editar: toda su precisión, el decimal del locale de la empresa y sin miles (4.13-3c).
export const textoParaEditar = (valor: number, locale: string): string =>
  formatearParaEditar(valor, { locale })

// Lo que se tipea en el campo del valor: acepta coma o punto decimal. null si no es un número
// mayor que cero o tiene más decimales de los que guarda la base.
export function valorTipeado(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,6})?$/.test(limpio)) {
    return null
  }
  const valor = Number(limpio)
  return valor > 0 ? valor : null
}
