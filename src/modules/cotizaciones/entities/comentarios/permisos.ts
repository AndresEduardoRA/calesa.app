// Qué se puede hacer con un comentario (4.27-2). Lo que no se puede no se dibuja (`docs/UX.md` › «Permisos en UI»); la base lo vuelve a pedir en cada RPC
// (`cotizacion_comentario_editar`, `…_borrar`, `cotizacion_comentar`). `puedeModerar` lo dice la lectura (`puede_moderar` de `cotizacion_comentarios`, el mismo
// `tiene_permiso('cotizaciones.moderar')` que mira borrar).
import type { Comentario } from './comentario'

// Editar: sólo quien lo escribió, y vivo. Moderar no edita el texto de otra persona.
export function puedeEditarComentario(comentario: Pick<Comentario, 'mio' | 'eliminado'>): boolean {
  return comentario.mio && !comentario.eliminado
}

// Borrar: quien lo escribió o quien modera, mientras no esté eliminado.
export function puedeBorrarComentario(
  comentario: Pick<Comentario, 'mio' | 'eliminado'>,
  puedeModerar: boolean,
): boolean {
  return !comentario.eliminado && (comentario.mio || puedeModerar)
}

// Responder: sólo una raíz (un nivel), también una eliminada que sigue con sus respuestas.
export function puedeResponderComentario(esRaiz: boolean): boolean {
  return esRaiz
}
