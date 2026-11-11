// Composición del NÚCLEO de `flujos` en el servidor: acá se decide qué implementación recibe cada interfaz de `entities/repositorios`.
// Los casos de uso del núcleo importan de este archivo, nunca de `infra/` (lo verifica eslint-plugin-boundaries) ni de la raíz, que sólo reexporta.
import 'server-only'
import type {
  LectorDeFases,
  LectorDeFlujo,
  LectorDeFlujosConfigurables,
} from '../../entities/repositorios'
import { getFasesDeOrigen } from '../../infra/queries/fases'
import { getFlujoParaConfigurar, getFlujosConfigurables } from '../../infra/queries/flujo'

export const leerFasesDeOrigen: LectorDeFases = getFasesDeOrigen

// El flujo entero para configurarlo (5.02) y los flujos que quien mira puede configurar. Los lee `/configuracion/flujos`.
export const leerFlujoParaConfigurar: LectorDeFlujo = getFlujoParaConfigurar
export const leerFlujosConfigurables: LectorDeFlujosConfigurables = getFlujosConfigurables
