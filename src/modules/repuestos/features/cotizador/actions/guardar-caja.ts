'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeConfiguracion } from '../../../areas/cotizador/composicion'
import { SIN_PERMISO_PARA_EL_COTIZADOR } from '../../../entities/cotizador/errores-de-configuracion'
import type { CajaConfigurada } from '../../../entities/cotizador/filas-de-configuracion'
import { esquemaGuardarCaja } from '../schemas/configuracion'

// Crea o edita una caja (8.12-2, C7): una caja repetida de la misma moneda da 23505 en «Monto». Sin versión: gana la última escritura (D25).
// El permiso se mira antes de escribir; lo que protege es la RLS de `repuestos.configurar`.
export const guardarCaja = actionClient
  .inputSchema(esquemaGuardarCaja)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CajaConfigurada>> => {
    if (!puede(ctx.permisos, 'repuestos.configurar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_EL_COTIZADOR)
    }
    const hecho = await repositorioDeConfiguracion.guardarCaja(parsedInput)
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeRepuestos)
    return hecho
  })
