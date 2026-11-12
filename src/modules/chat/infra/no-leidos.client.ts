// Cuántos mensajes sin leer tengo en total, leído en el navegador con `chat_no_leidos` (cuenta lo no silenciado, hasta 100).
import { type Resultado, errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { leerNoLeidos as validar } from '../entities/conversaciones'

export async function leerNoLeidos(): Promise<Resultado<number>> {
  const { data, error } = await createClient().rpc('chat_no_leidos')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return validar(data)
}
