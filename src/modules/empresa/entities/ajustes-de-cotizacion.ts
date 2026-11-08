// Los ajustes de cotización (docs/GLOSARIO.md): la vigencia (D1) y el vehículo obligatorio al cotizar (D3), las dos columnas de
// `ajustes_empresa` que valen para todas las cotizaciones. Los cambia `empresa_guardar_ajustes_de_cotizacion()` con la misma
// versión de la fila que el formulario de Empresa; la pantalla, Configuración › Cotización › Ajustes (4.20-4b).
import type { Tables } from '@/shared/types/database.types'

export type AjustesDeCotizacion = {
  vigenciaDias: number
  vehiculoObligatorioAlCotizar: boolean
  // La versión tal como la dio la base (con sus microsegundos): nunca pasa por `Date`.
  actualizadoEn: string
}

// Lo mismo que el `check` de la columna y la RPC.
export const VIGENCIA_MINIMA_DIAS = 1
export const VIGENCIA_MAXIMA_DIAS = 365

type FilaDeAjustesDeCotizacion = Pick<
  Tables<'ajustes_empresa'>,
  'vigencia_dias' | 'vehiculo_obligatorio_al_cotizar' | 'actualizado_en'
>

export function ajustesDeCotizacionDesde(fila: FilaDeAjustesDeCotizacion): AjustesDeCotizacion {
  return {
    vigenciaDias: fila.vigencia_dias,
    vehiculoObligatorioAlCotizar: fila.vehiculo_obligatorio_al_cotizar,
    actualizadoEn: fila.actualizado_en,
  }
}
