// El documento del sitio (guías y legales: JSON de ProseMirror) y su lista blanca. Es **espejo** de
// `_web_doc_html()` (`supabase/migrations/…_web_doc_html.sql`): los mismos nodos, las mismas marcas, los
// mismos topes, el mismo orden de chequeos (el primer rechazo coincide) y el mismo HTML. `doc.test.ts`
// corre la función SQL sobre `doc.casos.ts` y exige el mismo resultado. El HTML que sirve la web lo
// deriva la base; este espejo sirve para validar en el editor y previsualizar sin ir a la base.
import {
  MAXIMO_DE_BYTES_DEL_DOCUMENTO,
  MOTIVO_DE_TAMANO,
  Rechazo,
  esObjeto,
  htmlDeNodo,
} from './doc-nodos'
import type { Crudo } from './doc-nodos'

export {
  MAXIMO_DE_BYTES_DEL_DOCUMENTO,
  MAXIMO_DEL_ALT,
  MOTIVO_DE_ENLACE,
  MOTIVO_DE_FORMATO,
  MOTIVO_DE_IMAGEN,
  MOTIVO_DE_NIVELES,
  MOTIVO_DE_TAMANO,
  PROFUNDIDAD_MAXIMA,
  escaparHtml,
  hrefSeguro,
  rutaDeImagenSegura,
} from './doc-nodos'

export type HtmlDelDocumento = { ok: true; html: string } | { ok: false; motivo: string }

// Todo el texto escrito, sin separadores: para saber si el documento dice algo.
function textosDe(nodo: unknown): string {
  if (!esObjeto(nodo)) {
    return ''
  }
  const propio = typeof nodo['text'] === 'string' ? nodo['text'] : ''
  const contenido = nodo['content']
  return propio + (Array.isArray(contenido) ? contenido.map(textosDe).join('') : '')
}

function tieneImagen(documento: Crudo): boolean {
  const contenido = documento['content']
  return Array.isArray(contenido) && contenido.some((n) => esObjeto(n) && n['type'] === 'image')
}

// El documento escrito como lo escribe la base (`jsonb::text`: un espacio después de «:» y de «,»),
// para medirlo igual que `octet_length(p_doc::text)`.
function comoLaBase(valor: unknown): string {
  if (Array.isArray(valor)) {
    return `[${valor.map(comoLaBase).join(', ')}]`
  }
  if (esObjeto(valor)) {
    return `{${Object.entries(valor)
      .map(([k, v]) => `${JSON.stringify(k)}: ${comoLaBase(v)}`)
      .join(', ')}}`
  }
  return valor === undefined ? 'null' : JSON.stringify(valor)
}

// El HTML del documento, o el motivo del rechazo. Nulo, o sin texto ni imágenes, es `''`.
export function htmlDelDocumento(valor: unknown): HtmlDelDocumento {
  if (valor === null || valor === undefined) {
    return { ok: true, html: '' }
  }
  if (new TextEncoder().encode(comoLaBase(valor)).length > MAXIMO_DE_BYTES_DEL_DOCUMENTO) {
    return { ok: false, motivo: MOTIVO_DE_TAMANO }
  }
  try {
    const html = htmlDeNodo(valor, 'raiz', 0)
    const vacio =
      textosDe(valor).replace(/^[ \n\t]+|[ \n\t]+$/g, '') === '' &&
      !(esObjeto(valor) && tieneImagen(valor))
    return { ok: true, html: vacio ? '' : html }
  } catch (error) {
    if (error instanceof Rechazo) {
      return { ok: false, motivo: error.message }
    }
    throw error
  }
}
