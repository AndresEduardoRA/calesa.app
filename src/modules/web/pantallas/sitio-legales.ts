// La pestaña «Legales» de Configuración › Sitio web: la llenó el 8.03-2. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta lo que esa pestaña dibuja y nada más. El formulario viaja diferido: `pestanas.ts` (y por él el hub) importa este hueco.
import type { HuecoDePestana } from '../entities/nucleo/hueco-de-pestana'
import { FormularioDeLegales } from '../features/contenido/legales/components/diferidos'
import type { PropsDeLegales } from '../features/contenido/legales/components/formulario-de-legales'

export { FormularioDeLegales }
export type { PropsDeLegales }

export const PESTANA_DE_LEGALES: HuecoDePestana<PropsDeLegales> = FormularioDeLegales
