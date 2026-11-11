// Lo que los casos de uso necesitan de afuera, dicho como interfaces. La implementación (Supabase)
// vive en `infra/` y se la entrega `composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import type { FaseResumen } from './fase'
import type { FlujoConfigurable, FlujoParaConfigurar } from './flujo'

// Las fases del flujo de logística de un origen, también las jubiladas. Un origen recién creado
// todavía no tiene ninguna.
export type LectorDeFases = (origenId: string) => Promise<Resultado<FaseResumen[]>>

// El flujo entero para configurarlo: fases con todos sus atributos, transiciones, requisitos y roles. `null` si el id no es de ningún flujo.
export type LectorDeFlujo = (flujoId: string) => Promise<Resultado<FlujoParaConfigurar | null>>

// Los flujos que estos permisos pueden configurar (el selector de la pantalla), también los inactivos.
export type LectorDeFlujosConfigurables = (
  permisos: Permisos,
) => Promise<Resultado<FlujoConfigurable[]>>
