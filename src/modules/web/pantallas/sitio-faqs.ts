// La pestaña «Preguntas frecuentes» de Configuración › Sitio web: la llenó el 8.02-1. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta lo que esa pestaña dibuja y nada más. La sección viaja diferida: `pestanas.ts` (y por él el hub) importa este hueco.
import type { HuecoDePestana } from '../entities/nucleo/hueco-de-pestana'
import { PreguntasFrecuentes } from '../features/contenido/faqs/components/diferidos'
import type { PropsDePreguntasFrecuentes } from '../features/contenido/faqs/components/preguntas-frecuentes'

export { PreguntasFrecuentes }
export type { PropsDePreguntasFrecuentes }

export const PESTANA_DE_FAQS: HuecoDePestana<PropsDePreguntasFrecuentes> = PreguntasFrecuentes
