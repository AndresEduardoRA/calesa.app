import 'server-only'
import { connection } from 'next/server'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { integracionesDesde, type ClaveIntegracion } from '../../entities/integraciones'
import type { LectorDeIntegraciones } from '../../entities/repositorios'

// Interruptor, configuración no secreta y cuándo se guardó el secreto. El secreto no está acá ni
// en ninguna columna legible: vive en Vault.
export const getIntegraciones: LectorDeIntegraciones = cache(async () => {
  await connection()
  const supabase = await createClient()
  const { data, error } = await supabase.from('integraciones').select('*').order('clave')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(integracionesDesde(data))
})

// ¿Está prendida? Lo preguntan otros módulos antes de ofrecer algo que depende de ella (el alta
// de un vehículo por link). Si la base no responde, no: apagada es el lado seguro.
export async function integracionActiva(clave: ClaveIntegracion): Promise<boolean> {
  const integraciones = await getIntegraciones()
  if (!integraciones.ok) {
    console.error('No se pudieron leer las integraciones', integraciones.error)
    return false
  }
  return integraciones.data.some((una) => una.clave === clave && una.activa)
}
