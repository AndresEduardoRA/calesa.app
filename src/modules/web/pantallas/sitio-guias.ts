// La pestaña «Guías» de Configuración › Sitio web: la llenó el 8.03-1. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta lo que esa pestaña dibuja y nada más. La pestaña viaja diferida: `pestanas.ts` (y por él el hub) importa este hueco.
import type { HuecoDePestana } from '../entities/nucleo/hueco-de-pestana'
import { PestanaDeGuias } from '../features/contenido/guias/components/diferidos'
import type { PropsDeLaPestanaDeGuias } from '../features/contenido/guias/components/pestana-de-guias'

export { PestanaDeGuias }
export type { PropsDeLaPestanaDeGuias }

export const PESTANA_DE_GUIAS: HuecoDePestana<PropsDeLaPestanaDeGuias> = PestanaDeGuias
