// La pestaña «Ajustes» de Configuración › Sitio web: la llenó el 8.01-4. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`):
// reexporta lo que esa pestaña dibuja y nada más. El formulario viaja diferido: `pestanas.ts` (y por él el hub) importa este hueco.
import type { HuecoDePestana } from '../entities/nucleo/hueco-de-pestana'
import { FormularioDeAjustesDelSitio } from '../features/sitio/ajustes/components/diferidos'
import type { PropsDeAjustesDelSitio } from '../features/sitio/ajustes/components/formulario-de-ajustes-del-sitio'

export { FormularioDeAjustesDelSitio }
export type { PropsDeAjustesDelSitio }

export const PESTANA_DE_AJUSTES: HuecoDePestana<PropsDeAjustesDelSitio> =
  FormularioDeAjustesDelSitio
