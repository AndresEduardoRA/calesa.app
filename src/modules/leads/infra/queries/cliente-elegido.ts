import 'server-only'
import { errorDePostgrest, fallo, MENSAJE_INESPERADO, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { clienteElegidoDesde, type LectorDeClienteElegido } from '../../entities/panel-para-cotizar'

// El lead de `?lead=` de la hoja de cotizar, con la sesión de quien mira: `ok(null)` sólo cuando la lectura respondió sin fila (no existe, está en la
// papelera o no se ve: la hoja lo suelta); un error de la lectura es un error, nunca «no se ve». Por la clave primaria de `leads` (`leads_vista` es
// `security_invoker`): la RLS decide.
export const getClienteElegido: LectorDeClienteElegido = async (id) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads_vista')
    .select('id, nombre, tipo_lead_id, numero, numero_propio, numero_propio_creador')
    .eq('id', id)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const fila = data[0]
  if (fila === undefined) {
    return ok(null)
  }
  const cliente = clienteElegidoDesde(fila)
  return cliente === null ? fallo('inesperado', MENSAJE_INESPERADO) : ok(cliente)
}
