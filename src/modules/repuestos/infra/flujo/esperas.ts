import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  esperasDesde,
  TOPE_DE_ESPERAS,
  type EsperasDelVehiculo,
} from '../../entities/flujo/esperas'

// Los repuestos que un vehículo espera (8.13-1): una sola llamada a `repuestos_pendientes_de_vehiculo` con la sesión de quien mira, de modo que la base corta a cero filas sin
// `repuestos.ver` y oculta los nombres de fase sin `logistica.ver` del vehículo. La base ya devuelve una fila de más (`_acotar_pagina(p_tope, 50, 200) + 1`): con ella se sabe si hay más, nunca un total.
export async function esperasQueDestraban(
  vehiculoId: string,
): Promise<Resultado<EsperasDelVehiculo>> {
  if (!z.guid().safeParse(vehiculoId).success) {
    return fallo('validacion', 'El vehículo no es válido.')
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('repuestos_pendientes_de_vehiculo', {
    p_vehiculo: vehiculoId,
    p_tope: TOPE_DE_ESPERAS,
  })
  return error ? { ok: false, error: errorDePostgrest(error) } : esperasDesde(data)
}
