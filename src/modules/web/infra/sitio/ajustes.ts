import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { ajustesDelSitioDesde } from '../../entities/sitio/ajustes'
import type { LectorDeAjustesDelSitio } from '../../entities/sitio/repositorios'

// Los ajustes del sitio con su versión. Los lee cualquier cuenta con sesión (`ajustes_web: leer`); cambiarlos pide
// `web.ajustes.gestionar` (`web_ajustes_guardar`). Si falla, falla: la pestaña muestra el error en vez de valores vacíos que se
// guardarían encima. `ajustes_web` es una fila (tabla acotada).
export const getAjustesDelSitio: LectorDeAjustesDelSitio = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ajustes_web')
    .select(
      'nombre_sitio, lema, whatsapp_respaldo, horario, direccion_publica, redes, seo, mostrar_moneda_secundaria, origenes_visibles, actualizado_en',
    )
    .eq('id', 1)
    .single()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(ajustesDelSitioDesde(data))
})
