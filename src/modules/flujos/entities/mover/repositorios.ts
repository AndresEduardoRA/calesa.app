// Lo que `mover` necesita de afuera, dicho como interfaz. La implementación (Supabase) vive en `infra/mover/` y la une `areas/mover/composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { FlujoDeOrigen } from './flujo-de-origen'

// El flujo de vehículos del origen con sus reglas activas y los atributos de sus fases. `null` si el origen no tiene flujo (uno recién creado).
export type LectorDeFlujoDeOrigen = (origenId: string) => Promise<Resultado<FlujoDeOrigen | null>>
