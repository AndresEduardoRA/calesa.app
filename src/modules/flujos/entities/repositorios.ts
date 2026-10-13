// Lo que los casos de uso necesitan de afuera, dicho como interfaces. La implementación (Supabase)
// vive en `infra/` y se la entrega `composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { FaseResumen } from './fase'

// Las fases del flujo de logística de un origen, también las jubiladas. Un origen recién creado
// todavía no tiene ninguna.
export type LectorDeFases = (origenId: string) => Promise<Resultado<FaseResumen[]>>
