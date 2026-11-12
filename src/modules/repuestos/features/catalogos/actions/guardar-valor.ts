'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeValores } from '../../../areas/catalogos/composicion'
import type { ValorDeCatalogo } from '../../../entities/catalogos/catalogo'
import { SIN_PERMISO_PARA_LOS_CATALOGOS } from '../../../entities/catalogos/errores'
import { esquemaGuardarValor } from '../schemas/valor'

// Renombra, ordena (el campo «Orden», D21) o activa y desactiva un valor, con sólo lo que cambió (8.08-2). El permiso se mira antes de escribir (D26); lo que protege es la RLS.
export const guardarValor = actionClient
  .inputSchema(esquemaGuardarValor)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ValorDeCatalogo>> => {
    if (!puede(ctx.permisos, 'repuestos.configurar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_LOS_CATALOGOS)
    }
    const hecho = await repositorioDeValores.guardar(parsedInput)
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeRepuestos)
    return hecho
  })
