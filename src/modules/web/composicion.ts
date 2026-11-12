// Composición del módulo en el servidor: qué implementación recibe cada interfaz de
// `entities/sitio/repositorios`. Lo que exporta `index.ts` sale de acá, nunca de `infra/`.
import 'server-only'
import type { LectorDeDireccionPublica } from './entities/sitio/repositorios'
import { getDireccionPublica } from './infra/sitio/direccion-publica'

export const leerDireccionPublica: LectorDeDireccionPublica = getDireccionPublica
