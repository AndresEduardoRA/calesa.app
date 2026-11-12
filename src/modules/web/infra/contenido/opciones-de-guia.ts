import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { TOPE_DE_OPCIONES_DE_GUIA } from '../../entities/contenido/guias'
import type { LectorDeOpcionesDeGuia } from '../../entities/contenido/repositorios'

type Opcion = { id: string; nombre: string }

// La opción actual (si la hay) que la lista leída no trae: una desactivada o ya sin sesión; sin ella el selector se vería vacío.
function conLaActual(leidas: readonly Opcion[], actual: Opcion | null | undefined): Opcion[] {
  return actual && !leidas.some((fila) => fila.id === actual.id) ? [actual] : []
}

// Las categorías activas (por orden y nombre) y las personas del equipo que pueden firmar, `tope + 1` cada una; la categoría y el autor
// de la guía entran aunque ya no estén activos, para que el selector no se vea vacío. Se leen al abrir la guía (decenas de filas).
export const getOpcionesDeGuia: LectorDeOpcionesDeGuia = async ({ categoriaId, autorId }) => {
  const supabase = await createClient()
  const [categorias, autores, categoriaActual, autorActual] = await Promise.all([
    supabase
      .from('web_categorias_guias')
      .select('id, nombre')
      .eq('activa', true)
      .order('orden')
      .order('nombre')
      .limit(TOPE_DE_OPCIONES_DE_GUIA + 1),
    supabase
      .from('perfiles')
      .select('id, nombre')
      .eq('activo', true)
      .eq('bloqueado', false)
      .is('baja_en', null)
      .order('nombre')
      .limit(TOPE_DE_OPCIONES_DE_GUIA + 1),
    categoriaId === null
      ? Promise.resolve(null)
      : supabase
          .from('web_categorias_guias')
          .select('id, nombre')
          .eq('id', categoriaId)
          .limit(1)
          .maybeSingle(),
    autorId === null
      ? Promise.resolve(null)
      : supabase.from('perfiles').select('id, nombre').eq('id', autorId).limit(1).maybeSingle(),
  ])
  const fallido = [categorias, autores, categoriaActual, autorActual].find(
    (lectura) => lectura?.error,
  )?.error
  if (fallido) {
    return { ok: false, error: errorDePostgrest(fallido) }
  }
  const delTope = cortarAlTope(categorias.data ?? [], TOPE_DE_OPCIONES_DE_GUIA)
  const personas = cortarAlTope(autores.data ?? [], TOPE_DE_OPCIONES_DE_GUIA)
  return ok({
    categorias: [
      ...delTope.filas.map((fila) => ({ ...fila, activa: true })),
      ...conLaActual(delTope.filas, categoriaActual?.data).map((fila) => ({
        ...fila,
        activa: false,
      })),
    ],
    autores: [...personas.filas, ...conLaActual(personas.filas, autorActual?.data)],
    hayMasCategorias: delTope.hayMas,
    hayMasAutores: personas.hayMas,
  })
}
