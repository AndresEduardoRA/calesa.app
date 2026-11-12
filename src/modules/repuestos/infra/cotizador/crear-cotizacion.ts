import 'server-only'
import { z } from 'zod'
import { fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  NO_SE_LEYO_LA_RESPUESTA,
  rechazoAlCrear,
} from '../../entities/cotizador/errores-de-cotizacion'
import type { RepositorioDeCotizaciones } from '../../entities/cotizador/repositorio'

// Crear una cotización de repuestos sólo por RPC (`repuestos_cotizacion_crear`, 8.12-1), con el cliente de quien pide: la base vuelve a exigir
// `repuestos.cotizar` y `repuestos.ver`, el proyecto vivo y abierto, y congela el snapshot de la configuración vigente. Acá no hay aritmética.
const esquemaCreada = z.object({ id: z.guid(), numero: z.number().int() })

export const cotizacionesSupabase: Pick<RepositorioDeCotizaciones, 'crear'> = {
  crear: async ({ id, proyectoId, moneda }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('repuestos_cotizacion_crear', {
      p_id: id,
      p_proyecto: proyectoId,
      p_moneda: moneda,
    })
    if (error) return rechazoAlCrear(error)
    const leida = esquemaCreada.safeParse(data)
    return leida.success
      ? ok({ id: leida.data.id, numero: leida.data.numero })
      : fallo('inesperado', NO_SE_LEYO_LA_RESPUESTA)
  },
}
