import 'server-only'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { EscritorDePoliticaDeLaCola } from '../../entities/cola/repositorios'

// La clave que la base pone en `hint` (22023) → el campo del formulario donde se escribe el motivo.
const CAMPO_DEL_HINT: Record<string, string> = {
  cola_activa: 'colaActiva',
  ttl_contacto_minutos: 'ttlContactoMinutos',
  dias_pegajoso: 'diasPegajoso',
  max_abiertas_default: 'maxAbiertasDefault',
  max_intentos: 'maxIntentos',
}

// La política de la cola (8.04-3), por RPC: con sólo claves de la cola, la base pide `web.cola.gestionar` (o `web.ajustes.gestionar`), valida cada una y
// compara la versión (`PT409`).
export const guardarPolitica: EscritorDePoliticaDeLaCola = async ({
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
