// Composición del NÚCLEO de `flujos` en el servidor: acá se decide qué implementación recibe cada interfaz de `entities/repositorios`.
// Los casos de uso del núcleo importan de este archivo, nunca de `infra/` (lo verifica eslint-plugin-boundaries) ni de la raíz, que sólo reexporta.
import 'server-only'
import type { LectorDeFases } from '../../entities/repositorios'
import { getFasesDeOrigen } from '../../infra/queries/fases'

export const leerFasesDeOrigen: LectorDeFases = getFasesDeOrigen
