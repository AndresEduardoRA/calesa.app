// Composición del área `sitio` de `web` en el servidor: qué implementación recibe cada interfaz de
// `entities/sitio/repositorios`. Sale por la `composicion.ts` de la raíz; lo exporta `areas/sitio/index.ts`, nunca `infra/`.
import 'server-only'
import type { LectorDeDireccionPublica } from '../../entities/sitio/repositorios'
import { getDireccionPublica } from '../../infra/sitio/direccion-publica'

export const leerDireccionPublica: LectorDeDireccionPublica = getDireccionPublica
