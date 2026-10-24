import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { respuestaDeNivelesDesde } from '../entities/nivel'
import type { RepositorioDeNiveles } from '../entities/repositorios-de-niveles'

// Los niveles se escriben sólo por estas RPC (`…20261019006100_niveles_de_acceso.sql` y `…006400_nivel_restaurar.sql`), con `equipo.roles.gestionar`.
// Renombrar, retirar, restaurar y eliminar piden la versión (`PT409` legible si otra pestaña la cambió). Todas devuelven la lista entera: la
// pantalla no vuelve a leer. Eliminar uno en uso responde 23503 con el texto de cuánto lo usan: llega tal cual a la pantalla.

const CAMPO_DEL_HINT: Record<string, string> = { nombre: 'nombre' }

function fallo(error: { code?: string | null; message: string; hint?: string | null }) {
  const campo = error.hint ? CAMPO_DEL_HINT[error.hint] : undefined
  return { ok: false as const, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

function respuesta(data: unknown) {
  const leida = respuestaDeNivelesDesde(data)
  return leida
    ? { ok: true as const, data: leida }
    : falloDe('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
}

export const nivelesSupabase: RepositorioDeNiveles = {
  crear: async ({ id, nombre }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('nivel_crear', { p_id: id, p_nombre: nombre })
    return error ? fallo(error) : respuesta(data)
  },
  renombrar: async ({ id, actualizadoEnEsperado, nombre }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('nivel_renombrar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_nombre: nombre,
    })
    return error ? fallo(error) : respuesta(data)
  },
  retirar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('nivel_retirar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : respuesta(data)
  },
  restaurar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('nivel_restaurar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : respuesta(data)
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('nivel_eliminar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : respuesta(data)
  },
}
