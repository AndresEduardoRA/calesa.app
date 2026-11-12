// Composición del área `sitio` de `web` en el servidor: qué implementación recibe cada interfaz de
// `entities/sitio/repositorios`. Sale por la `composicion.ts` de la raíz; lo exporta `areas/sitio/index.ts`, nunca `infra/`.
import 'server-only'
import type {
  EscritorDeAjustesDelSitio,
  LectorDeAjustesDelSitio,
  LectorDeDireccionPublica,
  LectorDeVehiculosQueDejanDeVerse,
} from '../../entities/sitio/repositorios'
import { getAjustesDelSitio } from '../../infra/sitio/ajustes'
import { getDireccionPublica } from '../../infra/sitio/direccion-publica'
import { guardarAjustesDelSitio as guardarEnLaBase } from '../../infra/sitio/guardar-ajustes'
import { getVehiculosQueDejanDeVerse } from '../../infra/sitio/vehiculos-que-dejan-de-verse'

export const leerDireccionPublica: LectorDeDireccionPublica = getDireccionPublica
export const leerAjustesDelSitio: LectorDeAjustesDelSitio = getAjustesDelSitio
// Lo usa la action de la pestaña «Ajustes» desde aquí; no sale por `index.ts`.
export const guardarAjustesDelSitio: EscritorDeAjustesDelSitio = guardarEnLaBase
export const leerVehiculosQueDejanDeVerse: LectorDeVehiculosQueDejanDeVerse =
  getVehiculosQueDejanDeVerse
