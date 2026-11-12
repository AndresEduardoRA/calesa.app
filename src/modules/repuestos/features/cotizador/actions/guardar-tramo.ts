'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeConfiguracion } from '../../../areas/cotizador/composicion'
import { SIN_PERMISO_PARA_EL_COTIZADOR } from '../../../entities/cotizador/errores-de-configuracion'
import type { TramoConfigurado } from '../../../entities/cotizador/filas-de-configuracion'
import { esquemaGuardarTramo } from '../schemas/configuracion'

// Crea o edita un tramo de logística (8.12-2, C6): desactivar nunca choca; activar o mover uno que se cruza da 23P01 en «Desde». Sin versión: gana la última escritura (D25).
// El permiso se mira antes de escribir; lo que protege es la RLS de `repuestos.configurar`.
export const guardarTramo = actionClient
  .inputSchema(esquemaGuardarTramo)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<TramoConfigurado>> => {
    if (!puede(ctx.permisos, 'repuestos.configurar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_EL_COTIZADOR)
    }
    const hecho = await repositorioDeConfiguracion.guardarTramo(parsedInput)
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeRepuestos)
    return hecho
  })
