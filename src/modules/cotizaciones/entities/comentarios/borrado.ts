// Borrar un comentario por su URL (`?panel=borrar-comentario&comentario=<id>`, 4.27-2): se puede recargar, «atrás» lo cierra y una URL que no abre avisa y se
// limpia. Lo que dice el diálogo. Nada de React: `features/comentarios/hooks/use-borrado-por-url.ts` lo usa con `usePanelPorUrl()`.
import { autorDelComentario, type Comentario } from './comentario'
import { puedeBorrarComentario } from './permisos'
import type { RaizCargada } from './lista'

export const PANEL_BORRAR_COMENTARIO = 'borrar-comentario'
export const CLAVE_DE_COMENTARIO = 'comentario'
export const MENSAJE_YA_NO_ESTA = 'Ese comentario ya no está.'

// Lo más que se cita del texto en el diálogo.
const LARGO_DE_LA_CITA = 80

// Por qué la URL no abre (nulo = abre): el comentario no está entre los cargados o ya no se puede borrar. Se revisa una vez, al llegar.
export function motivoParaNoBorrar(
  encontrado: { comentario: Comentario } | null,
  puedeModerar: boolean,
): string | null {
  return encontrado && puedeBorrarComentario(encontrado.comentario, puedeModerar)
    ? null
    : MENSAJE_YA_NO_ESTA
}

function cita(cuerpo: string | null): string {
  const texto = (cuerpo ?? '').replace(/\s+/g, ' ').trim()
  return texto.length > LARGO_DE_LA_CITA ? `${texto.slice(0, LARGO_DE_LA_CITA).trimEnd()}…` : texto
}

// «Borrar tu comentario» o «Borrar el comentario de Ana»; la descripción cita el comienzo y, en una raíz con respuestas, dice que ellas quedan.
export function textosDelBorrado(
  comentario: Comentario,
  esRaizConRespuestas: boolean,
): { titulo: string; descripcion: string } {
  const titulo = comentario.mio
    ? 'Borrar tu comentario'
    : `Borrar el comentario de ${autorDelComentario(comentario)}`
  const quedan = esRaizConRespuestas ? ' Las respuestas quedan.' : ''
  return { titulo, descripcion: `«${cita(comentario.cuerpo)}». No se puede deshacer.${quedan}` }
}

// Si borrar esta raíz la deja «eliminada» (tiene respuestas, cargadas o por traer).
export function tieneRespuestas(raiz: Pick<RaizCargada, 'respuestas' | 'hayMasRespuestas'>) {
  return raiz.respuestas.length > 0 || raiz.hayMasRespuestas
}
