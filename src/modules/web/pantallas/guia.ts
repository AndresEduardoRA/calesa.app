// La página de una guía (`/configuracion/web/guias/[id]`, 8.03-1). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa
// pantalla dibuja y nada más. El formulario viaja diferido: Tiptap y el resto se piden al abrir la página.
import { FormularioDeGuiaDiferido } from '../features/contenido/guias/components/diferidos-de-la-guia'
import type { PropsDeLaGuia } from '../features/contenido/guias/components/formulario-de-guia'

export { FormularioDeGuiaDiferido as FormularioDeGuia }
export type { PropsDeLaGuia }
