import 'server-only'
import { connection } from 'next/server'
import { cache } from 'react'
import { conteoAcotado } from '@/shared/lib/conteo'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  TOPE_DE_VEHICULOS_QUE_CAMBIAN,
  integracionesDesde,
  type ClaveIntegracion,
} from '../../entities/integraciones'
import type {
  LectorDeIntegraciones,
  LectorDeVehiculosQueCambian,
} from '../../entities/repositorios'

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

// La ayuda del interruptor de la web pública. La RPC cuenta sobre un subselect con `limit 51` de
// `interno.vitrina_vehiculos` (su índice `vehiculos_vitrina_idx`) y exige `empresa.ajustes.gestionar`:
// sólo se llama para quien puede editar.
export const getVehiculosQueCambian: LectorDeVehiculosQueCambian = cache(async () => {
  await connection()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('web_publica_vehiculos_que_cambian')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(conteoAcotado(data, TOPE_DE_VEHICULOS_QUE_CAMBIAN))
})
