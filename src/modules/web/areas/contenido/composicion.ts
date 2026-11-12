// Composición del área `contenido` de `web` en el servidor: qué implementación recibe cada interfaz de `entities/contenido/repositorios`.
// Sale por la `composicion.ts` de la raíz; lo exporta `areas/contenido/index.ts`, nunca `infra/`.
import 'server-only'
import type {
  EscritorDeGuias,
  LectorDeGuia,
  LectorDeGuias,
  LectorDeOpcionesDeGuia,
} from '../../entities/contenido/repositorios'
import { getGuia, getGuias } from '../../infra/contenido/guias-lectura'
import { escritorDeGuias } from '../../infra/contenido/guias-escritura'
import { getOpcionesDeGuia } from '../../infra/contenido/opciones-de-guia'

export const leerGuias: LectorDeGuias = getGuias
export const leerGuia: LectorDeGuia = getGuia
export const leerOpcionesDeGuia: LectorDeOpcionesDeGuia = getOpcionesDeGuia
// Lo usan las actions de las guías desde aquí; no sale por `index.ts`.
export const escribirGuias: EscritorDeGuias = escritorDeGuias
