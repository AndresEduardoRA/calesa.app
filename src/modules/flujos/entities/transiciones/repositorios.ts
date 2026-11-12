// Lo que las salidas de una fase necesitan de afuera, dicho como interfaces. La implementación (Supabase) vive en `infra/transiciones/` y la une
// `areas/transiciones/composicion.ts`.
import type { ErrorApp } from '@/shared/lib/errores'
import type { VersionDeTransicion } from './respuestas'

// Una escritura que falla: el error y, si la base nombró un campo del formulario en el `hint`, ese campo.
export type FalloDeTransicion = { ok: false; error: ErrorApp; campo?: string }
export type ResultadoDeTransicion<T> = { ok: true; data: T } | FalloDeTransicion

// Las RPC de escritura. Ninguna devuelve la lista: devuelven la versión nueva del flujo y la pantalla relee. Todas llevan la versión que se tenía en pantalla (`PT409`).
export type RepositorioDeTransiciones = {
  // Con el id del intento: repetirlo da «Esa transición ya existe» (`23505`, hint `id`). La acción nula dice «Mover».
  crear: (pedido: {
    id: string
    flujoId: string
    actualizadoEnEsperado: string
    deFaseId: string
    aFaseId: string
    accion: string | null
    notaObligatoria: boolean
  }) => Promise<ResultadoDeTransicion<VersionDeTransicion>>
  eliminar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<ResultadoDeTransicion<VersionDeTransicion>>
}
