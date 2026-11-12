import {
  documentoLimpio,
  type DocumentoDelSitio,
} from '../../../../entities/contenido/documento-limpio'
import type { GuiaCompleta } from '../../../../entities/contenido/guias'

// Lo que la página de la guía edita, todo como texto (un selector vacío es `''`) salvo el documento. Es también lo que mide el borrador.
export type ValoresDeGuia = {
  titulo: string
  slug: string
  resumen: string
  categoriaId: string
  autorId: string
  portadaRuta: string
  seoTitulo: string
  seoDescripcion: string
  cuerpo: DocumentoDelSitio | null
}

// La guía guardada como valores del formulario; el documento se reduce a la lista blanca al abrirlo.
export function valoresDeGuia(guia: GuiaCompleta): ValoresDeGuia {
  return {
    titulo: guia.titulo,
    slug: guia.slug,
    resumen: guia.resumen ?? '',
    categoriaId: guia.categoriaId ?? '',
    autorId: guia.autorId ?? '',
    portadaRuta: guia.portadaRuta ?? '',
    seoTitulo: guia.seoTitulo ?? '',
    seoDescripcion: guia.seoDescripcion ?? '',
    cuerpo: documentoLimpio(guia.cuerpoDoc),
  }
}
