// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type { LectorDeFases } from './entities/repositorios'
import { getFasesDeOrigen } from './infra/queries/fases'

export const leerFasesDeOrigen: LectorDeFases = getFasesDeOrigen
