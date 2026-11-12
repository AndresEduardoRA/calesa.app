import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { legalesDesde } from '../../entities/contenido/legales'
import type { LectorDeLegales } from '../../entities/contenido/repositorios'

// Los legales con la versión de la fila de `ajustes_web` (la misma de «Ajustes»; es una sola fila, `id = 1`). Los lee cualquier cuenta con
// sesión (`ajustes_web: leer`); cambiarlos pide `web.ajustes.gestionar`. Si falla, falla: la pestaña muestra el error y no un formulario
// vacío que se guardaría encima.
export const getLegales: LectorDeLegales = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ajustes_web')
    .select('legales, actualizado_en')
    .eq('id', 1)
    .single()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(legalesDesde(data.legales, data.actualizado_en))
})
