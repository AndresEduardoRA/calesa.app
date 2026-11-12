// Lo que «Reglas» necesita de afuera, dicho como interfaces. La implementación (Supabase) vive en `infra/reglas/` y la une `areas/reglas/composicion.ts`.
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { ImpactoDeRegla } from './impacto'
import type { CatalogoDeTransporte, OfertaDeTransporte } from './oferta'

// La oferta guardada de un flujo (la lee aunque «Transporte» esté apagada).
export type LectorDeOferta = (flujoId: string) => Promise<Resultado<OfertaDeTransporte>>

// Los puertos y navieras activos, para marcarlos.
export type LectorDeCatalogoDeTransporte = () => Promise<Resultado<CatalogoDeTransporte>>

// Una escritura que falla: el error y, si la base nombró un campo en el `hint`, ese campo.
export type FalloDeReglas = { ok: false; error: ErrorApp; campo?: string }
export type ResultadoDeReglas<T> = { ok: true; data: T } | FalloDeReglas

// Las tres RPC. `cambiar` y `guardarOferta` devuelven la versión nueva del flujo, texto ISO tal cual.
export type RepositorioDeReglas = {
  impacto: (pedido: {
    flujoId: string
    regla: string
  }) => Promise<ResultadoDeReglas<ImpactoDeRegla>>
  cambiar: (pedido: {
    flujoId: string
    version: string
    regla: string
    activa: boolean
  }) => Promise<ResultadoDeReglas<string>>
  guardarOferta: (pedido: {
    flujoId: string
    version: string
    puertosOrigen: string[]
    puertosDestino: string[]
    navieras: string[]
  }) => Promise<ResultadoDeReglas<string>>
}
