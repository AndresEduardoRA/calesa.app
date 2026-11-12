import { Node } from '@tiptap/react'
import { urlPublica } from '@/shared/lib/almacen'

// La imagen del documento del sitio: sólo `{ ruta, alt }` (la ruta es del bucket `web`, relativa). En el editor se ve con su URL pública; lo que
// se guarda es la ruta, nunca la URL (`_web_doc_imagen`). Sólo lee `img[data-ruta]`: una imagen pegada de otro sitio no crea nada. Va en el primer
// nivel del documento (la base no la admite adentro de una lista ni de una cita): el botón la inserta ahí y `documentoLimpio` descarta el resto.
export const ImagenDelSitio = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ruta: { default: null, rendered: false, parseHTML: (el) => el.getAttribute('data-ruta') },
      alt: { default: '', rendered: false, parseHTML: (el) => el.getAttribute('alt') ?? '' },
    }
  },

  parseHTML() {
    return [{ tag: 'img[data-ruta]' }]
  },

  renderHTML({ node }) {
    const ruta = typeof node.attrs['ruta'] === 'string' ? node.attrs['ruta'] : ''
    const alt = typeof node.attrs['alt'] === 'string' ? node.attrs['alt'] : ''
    return [
      'img',
      {
        src: ruta === '' ? '' : urlPublica('web', ruta),
        'data-ruta': ruta,
        alt,
        class: 'my-2 max-h-80 max-w-full rounded-(--radius-md) object-contain',
      },
    ]
  },
})
