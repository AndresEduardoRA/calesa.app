// Las categorías de las guías (8.03-2): las reglas puras de la lista, del orden y del borrado. La base decide (`web_categorias_guias`, sus policies
// con `web.contenido.gestionar`); esto sólo explica en la pantalla. La tabla no tiene versión: la última escritura gana.
import { slugDe } from './guias'

// `conGuias`: `true` o `false` si se pudo ver; `null` si la lectura de uso llegó a su tope y no se sabe (se dice «Sin verificar»).
export type CategoriaDeGuia = {
  id: string
  slug: string
  nombre: string
  orden: number
  activa: boolean
  conGuias: boolean | null
}

// Las categorías por orden y nombre, con un tope + 1 leído (`hayMas`).
export type ListaDeCategorias = { filas: CategoriaDeGuia[]; hayMas: boolean }

export type DireccionDeOrden = 'subir' | 'bajar'

export const MAXIMO_DEL_NOMBRE_DE_CATEGORIA = 60
// Igual que `TOPE_DE_OPCIONES_DE_GUIA`: el selector de la guía las muestra todas.
export const TOPE_DE_CATEGORIAS = 100

export const MOTIVO_SIN_PERMISO_PARA_CATEGORIAS = 'No tienes permiso para cambiar las categorías.'
export const MOTIVO_NOMBRE_SIN_LETRAS = 'Escribe un nombre con letras o números.'
export const MOTIVO_DE_CATEGORIA_REPETIDA = 'Ya hay una categoría con ese nombre.'
export const MOTIVO_DE_CATEGORIA_AUSENTE = 'Esta categoría ya no existe.'
export const MOTIVO_DE_CATEGORIA_CON_GUIAS = 'Tiene guías: desactívala.'
export const MOTIVO_DE_ELIMINAR_CON_GUIAS = 'Tiene guías: desactívala en vez de eliminarla.'
export const MOTIVO_DE_TOPE_DE_CATEGORIAS = `Ya hay ${String(TOPE_DE_CATEGORIAS)} categorías, el máximo. Elimina o reutiliza una.`

// La dirección de la categoría sale de su nombre, igual que la de una guía; sin letras ni números no hay dirección (`null`).
export function slugDeCategoria(nombre: string): string | null {
  const slug = slugDe(nombre)
  return slug === '' ? null : slug
}

// Lo que cambia al subir o bajar una categoría: todas se reescriben 0..n−1 (con todas en `0` por defecto, intercambiar dos no ordenaría).
// Sólo salen las filas cuyo `orden` cambia; en el extremo o con un `id` que no está, nada.
export function ordenDeCategorias(
  lista: readonly { id: string; orden: number }[],
  id: string,
  direccion: DireccionDeOrden,
): { id: string; orden: number }[] {
  const desde = lista.findIndex((fila) => fila.id === id)
  const hasta = direccion === 'subir' ? desde - 1 : desde + 1
  if (desde < 0 || hasta < 0 || hasta >= lista.length) {
    return []
  }
  const nueva = lista.map((fila) => fila.id)
  const movida = nueva[desde]
  const vecina = nueva[hasta]
  if (movida === undefined || vecina === undefined) {
    return []
  }
  nueva[desde] = vecina
  nueva[hasta] = movida
  return lista.flatMap((fila) => {
    const destino = nueva.indexOf(fila.id)
    return fila.orden === destino ? [] : [{ id: fila.id, orden: destino }]
  })
}

export function usoDeCategoria(categoria: Pick<CategoriaDeGuia, 'conGuias'>): string {
  if (categoria.conGuias === null) {
    return 'Sin verificar'
  }
  return categoria.conGuias ? 'Con guías' : 'Sin guías'
}

// «Eliminar» sale apagado con su motivo si la categoría tiene guías; sin verificar queda encendido (la action vuelve a revisar).
export function motivoDeNoEliminar(categoria: Pick<CategoriaDeGuia, 'conGuias'>): string | null {
  return categoria.conGuias === true ? MOTIVO_DE_CATEGORIA_CON_GUIAS : null
}
