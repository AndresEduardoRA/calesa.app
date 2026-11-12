import 'server-only'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { EscritorDeAjustesDelSitio } from '../../entities/sitio/repositorios'

// La clave que la base pone en `hint` (22023) → el campo del formulario donde se escribe el motivo.
const CAMPO_DEL_HINT: Record<string, string> = {
  nombre_sitio: 'nombreSitio',
  lema: 'lema',
  horario: 'horario',
  whatsapp_respaldo: 'whatsappRespaldo',
  direccion_publica: 'direccionPublica',
  redes: 'redes',
  seo: 'seo',
  origenes_visibles: 'origenesVisibles',
  mostrar_moneda_secundaria: 'mostrarMonedaSecundaria',
}

// Por RPC: la base exige `web.ajustes.gestionar` para las claves del sitio, valida cada una y compara la versión (`PT409`).
export const guardarAjustesDelSitio: EscritorDeAjustesDelSitio = async ({
  cambios,
  actualizadoEnEsperado,
}) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('web_ajustes_guardar', {
    p_actualizado_en_esperado: actualizadoEnEsperado,
    p_cambios: cambios,
  })
  if (error) {
    const campo = error.hint ? CAMPO_DEL_HINT[error.hint] : undefined
    const fallo = errorDePostgrest(error)
    return campo
      ? { ok: false, error: fallo, porCampo: { [campo]: fallo.mensaje } }
      : { ok: false, error: fallo }
  }
  return { ok: true, data: { actualizadoEn: data } }
}
