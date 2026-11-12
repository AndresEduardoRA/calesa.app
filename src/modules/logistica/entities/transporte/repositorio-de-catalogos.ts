// Crear y corregir puertos y navieras, dicho como interfaz (6.08-1). La implementación (Supabase, escritura directa bajo la RLS de `logistica.catalogos.gestionar`) vive en
// `infra/transporte/catalogos.ts` y se la entrega `areas/transporte/composicion.ts`. Sin borrar: se desactivan (D3).
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { DatosDeNaviera, DatosDePuerto, NavieraDeCatalogo, PuertoDeCatalogo } from './catalogo'

export type RepositorioDeCatalogosDeTransporte = {
  crearPuerto: (datos: DatosDePuerto) => Promise<ResultadoDeAccion<PuertoDeCatalogo>>
  // `cambios` es sólo lo que cambió (`cambiosDePuerto`); `nombre` y `pais` son los que se ven, para decir de cuál se habla si se repite.
  guardarPuerto: (pedido: {
    id: string
    nombre: string
    pais: string | null
    cambios: Partial<DatosDePuerto>
  }) => Promise<ResultadoDeAccion<PuertoDeCatalogo>>
  crearNaviera: (datos: DatosDeNaviera) => Promise<ResultadoDeAccion<NavieraDeCatalogo>>
  guardarNaviera: (pedido: {
    id: string
    nombre: string
    cambios: Partial<DatosDeNaviera>
  }) => Promise<ResultadoDeAccion<NavieraDeCatalogo>>
}
