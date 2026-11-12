import 'server-only'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import type { EscritorDeLegales } from '../../entities/contenido/repositorios'

// Por RPC y con **sólo** la clave `legales`: la base exige `web.ajustes.gestionar`, valida cada documento (22023, con `legales` en `hint`),
// aplica encima de lo guardado y compara la versión de la fila (`PT409`). Nunca manda otra clave de «Ajustes».
export const escritorDeLegales: EscritorDeLegales = async ({ cambios, actualizadoEnEsperado }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('web_ajustes_guardar', {
    p_actualizado_en_esperado: actualizadoEnEsperado,
    p_cambios: { legales: cambios } as unknown as Json,
  })
  if (error) {
    const fallo = errorDePostgrest(error)
    return error.hint === 'legales'
      ? { ok: false, error: fallo, porCampo: { legales: fallo.mensaje } }
      : { ok: false, error: fallo }
  }
  return { ok: true, data: { actualizadoEn: data } }
}
