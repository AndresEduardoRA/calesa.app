// Lo que la cadena necesita de afuera, dicho como interfaz (6.03-1). La implementación (Supabase) vive en `infra/cadena/` y la une `areas/cadena/composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { CursorDeLaColumna } from './columna'
import type { FiltrosDeLaCadena, NavieraParaFiltrar } from './filtros'
import type { CadenaLeida, PaginaDeLaColumna, ResultadoDeDondeEsta } from './leer'

export type PedidoDeLaColumna = {
  origenId: string
  // Nulo: la columna «Sin fase».
  faseId: string | null
  cursor: CursorDeLaColumna | null
  filtros: FiltrosDeLaCadena
}

// `logistica_cadena()`: la primera página de cada columna, con la sesión de quien mira.
export type LectorDeLaCadena = (
  origenId: string,
  filtros: FiltrosDeLaCadena,
) => Promise<Resultado<CadenaLeida>>
// `logistica_cadena_columna()`: lo que sigue de una columna.
export type LectorDeLaColumna = (pedido: PedidoDeLaColumna) => Promise<Resultado<PaginaDeLaColumna>>
// `logistica_donde_esta()`: dónde está lo que se busca, en todos los orígenes de la persona.
export type LectorDeDondeEsta = (buscar: string) => Promise<Resultado<ResultadoDeDondeEsta>>
// Los atributos de unos vehículos por su id, bajo la RLS de quien mira: lo que no ve no vuelve.
export type LectorDeAtributos = (
  ids: readonly string[],
) => Promise<Resultado<Map<string, Record<string, unknown>>>>
export type LectorDeNavieras = () => Promise<Resultado<NavieraParaFiltrar[]>>
