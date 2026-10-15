// Composición del módulo en el servidor: qué implementación recibe cada interfaz de
// `entities/repositorios`. Lo que exporta `index.ts` sale de acá, nunca de `infra/`.
import 'server-only'
import type { LectorDeDireccionPublica } from './entities/repositorios'
import { getDireccionPublica } from './infra/queries/sitio'

export const leerDireccionPublica: LectorDeDireccionPublica = getDireccionPublica
