// Lo que el área `flujo` de `repuestos` necesita de afuera, dicho como interfaz (8.13-3). La implementación (Supabase) vive en `infra/flujo/` y la une `areas/flujo/composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type {
  CadenaDeRepuestos,
  CursorDeLaColumna,
  FiltrosDeLaCadena,
  OrdenDeLaColumna,
  PaginaDeLaColumnaDeRepuestos,
} from './cadena'
import type { EsperasDelVehiculo } from './esperas'

export type PedidoDeLaColumnaDeRepuestos = {
  // Nulo: la columna «Sin fase».
  faseId: string | null
  orden: OrdenDeLaColumna
  cursor: CursorDeLaColumna | null
  filtros: FiltrosDeLaCadena
}

export type RepositorioDelFlujo = {
  // La primera página de cada columna, con la sesión de quien mira.
  cadena: (filtros: FiltrosDeLaCadena) => Promise<Resultado<CadenaDeRepuestos>>
  // Lo que sigue de una columna.
  columna: (
    pedido: PedidoDeLaColumnaDeRepuestos,
  ) => Promise<Resultado<PaginaDeLaColumnaDeRepuestos>>
  // Los repuestos que un vehículo espera.
  esperas: (vehiculoId: string) => Promise<Resultado<EsperasDelVehiculo>>
}
