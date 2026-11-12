import 'server-only'
import { fallo } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { rechazoDeTestimonio } from '../../entities/contenido/errores'
import type { RepositorioDeConsentimiento } from '../../entities/contenido/repositorios'

const SIN_VERSION = 'No pudimos leer cómo quedó el testimonio. Recarga para verlo.'

// El consentimiento de un testimonio se registra y se retira por RPC (`web_testimonio_consentir`, `web_testimonio_retirar`; 8.01-1): `consent_*` no se
// escribe directo. La RPC exige `web.contenido.gestionar`, la versión esperada (PT409) y dice su motivo en el mensaje; devuelve la versión nueva.
export const consentimientoSupabase: RepositorioDeConsentimiento = {
  consentir: async ({ id, actualizadoEnEsperado, canal, ciudad, vehiculo, foto }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('web_testimonio_consentir', {
      p_testimonio: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_canal: canal,
      p_ciudad: ciudad,
      p_vehiculo: vehiculo,
      p_foto: foto,
    })
    if (error) {
      return rechazoDeTestimonio(error)
    }
    return typeof data === 'string'
      ? { ok: true, data: { actualizadoEn: data } }
      : fallo('inesperado', SIN_VERSION)
  },
  retirar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('web_testimonio_retirar', {
      p_testimonio: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    if (error) {
      return rechazoDeTestimonio(error)
    }
    return typeof data === 'string'
      ? { ok: true, data: { actualizadoEn: data } }
      : fallo('inesperado', SIN_VERSION)
  },
}
