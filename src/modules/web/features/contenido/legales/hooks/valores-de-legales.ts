import type { DocumentoDelSitio } from '../../../../entities/contenido/documento-limpio'
import {
  TEXTOS_DE_LEGALES,
  type ClaveDeLegal,
  type LegalesDelSitio,
} from '../../../../entities/contenido/legales'

// Lo que la pestaña edita: el título y el documento de cada legal. Es también lo que mide el borrador.
export type ValoresDeLegalesEnPantalla = {
  terminosTitulo: string
  terminosDoc: DocumentoDelSitio | null
  privacidadTitulo: string
  privacidadDoc: DocumentoDelSitio | null
}

export const CAMPO_DE_TITULO: Record<ClaveDeLegal, 'terminosTitulo' | 'privacidadTitulo'> = {
  terminos: 'terminosTitulo',
  privacidad: 'privacidadTitulo',
}
export const CAMPO_DE_DOCUMENTO: Record<ClaveDeLegal, 'terminosDoc' | 'privacidadDoc'> = {
  terminos: 'terminosDoc',
  privacidad: 'privacidadDoc',
}

// Lo guardado como valores de la pantalla; un legal que aún no existe arranca con su título de siempre y sin texto.
export function valoresDeLegales(legales: LegalesDelSitio): ValoresDeLegalesEnPantalla {
  return {
    terminosTitulo: legales.terminos?.titulo ?? TEXTOS_DE_LEGALES.terminos.titulo,
    terminosDoc: legales.terminos?.doc ?? null,
    privacidadTitulo: legales.privacidad?.titulo ?? TEXTOS_DE_LEGALES.privacidad.titulo,
    privacidadDoc: legales.privacidad?.doc ?? null,
  }
}
