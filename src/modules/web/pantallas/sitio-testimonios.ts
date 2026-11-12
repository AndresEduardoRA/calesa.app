// La pestaña «Testimonios» de Configuración › Sitio web: la llenó el 8.02-2. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta lo que esa pestaña dibuja y nada más. La sección viaja diferida: `pestanas.ts` (y por él el hub) importa este hueco.
import type { HuecoDePestana } from '../entities/nucleo/hueco-de-pestana'
import { Testimonios } from '../features/contenido/testimonios/components/diferidos'
import type { PropsDeTestimonios } from '../features/contenido/testimonios/components/testimonios'

export { Testimonios }
export type { PropsDeTestimonios }

export const PESTANA_DE_TESTIMONIOS: HuecoDePestana<PropsDeTestimonios> = Testimonios
