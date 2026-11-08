// Composición del área `comentarios` de `cotizaciones` en el servidor. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeComentarios } from '../../entities/comentarios/repositorio'
import { comentariosSupabase } from '../../infra/comentarios/escribir'

// Comentar, editar y borrar un comentario de una cotización (4.27-2). Las actions de `features/comentarios/` lo usan; sale por la raíz sólo por el nombre.
export const repositorioDeComentarios: RepositorioDeComentarios = comentariosSupabase
