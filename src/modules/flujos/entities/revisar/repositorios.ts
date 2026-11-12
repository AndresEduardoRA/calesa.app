// Lo que «Revisar» necesita de afuera, dicho como interfaz. La implementación (Supabase) vive en `infra/revisar/` y la une `areas/revisar/composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { AvisoDeRevision } from './avisos'

// Los avisos de un flujo (`revisar_flujo`), ya ordenados y con `tope + 1` leídos para saber si hay más. A quien no configura el flujo, ninguno.
export type LectorDeAvisosDeRevision = (pedido: {
  flujoId: string
}) => Promise<Resultado<{ avisos: AvisoDeRevision[]; hayMas: boolean }>>
