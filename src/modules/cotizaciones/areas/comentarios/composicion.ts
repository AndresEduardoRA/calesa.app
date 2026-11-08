// Composición del área `comentarios` de `cotizaciones` en el servidor. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeComentarios } from '../../entities/comentarios/repositorio'
import type { RepositorioDeAdjuntos } from '../../entities/comentarios/repositorio-de-adjuntos'
import type { RepositorioDeMarcas } from '../../entities/comentarios/repositorio-de-marcas'
import { adjuntosSupabase } from '../../infra/comentarios/adjuntos'
import { comentariosSupabase } from '../../infra/comentarios/escribir'
import { marcasSupabase } from '../../infra/comentarios/marcas'

// Comentar, editar y borrar un comentario de una cotización (4.27-2). Las actions de `features/comentarios/` lo usan; sale por la raíz sólo por el nombre.
export const repositorioDeComentarios: RepositorioDeComentarios = comentariosSupabase

// Registrar y quitar un adjunto (4.27-3): el archivo ya lo subió el navegador.
export const repositorioDeAdjuntos: RepositorioDeAdjuntos = adjuntosSupabase

// Favorita, reportar y moderar (4.27-4): las escrituras van por las actions; la lectura de las marcas la hacen los huecos de la guardada, en el servidor.
export const repositorioDeMarcas: RepositorioDeMarcas = marcasSupabase
export { leerMarcasDeLaCotizacion } from '../../infra/comentarios/marcas'
