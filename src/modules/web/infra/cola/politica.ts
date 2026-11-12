import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { politicaDesde } from '../../entities/cola/politica'
import type { LectorDePoliticaDeLaCola } from '../../entities/cola/repositorios'

// La política de la cola con su versión (8.04-2). La lee cualquier cuenta con sesión (`ajustes_web: leer`); cambiarla pide `web.cola.gestionar`
// (`web_ajustes_guardar`, 8.04-3). `ajustes_web` es una fila (tabla acotada). Vive en el área `cola` porque un área de `web` no importa otra.
export const leerPolitica: LectorDePoliticaDeLaCola = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ajustes_web')
    .select(
      'cola_activa, ttl_contacto_minutos, dias_pegajoso, max_abiertas_default, max_intentos, whatsapp_respaldo, actualizado_en',
    )
    .eq('id', 1)
    .single()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(politicaDesde(data))
})
