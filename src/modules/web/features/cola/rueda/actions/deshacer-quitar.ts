'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { configurarEnLaRueda as configurarEnLaBase } from '../../../../areas/cola/composicion'
import { MOTIVO_SIN_PERMISO_COLA } from '../../../../entities/cola/rueda'
import { esquemaConfiguracionGuardada } from '../schemas/rueda'

// «Deshacer» de quitar: la vuelve a habilitar con los valores que tenía, aunque estén fuera de los rangos del formulario (la base acepta todo `smallint`).
// La base repite el permiso.
export const deshacerQuitar = actionClient
  .inputSchema(esquemaConfiguracionGuardada)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.cola.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_COLA)
    }
    const guardado = await configurarEnLaBase({ ...parsedInput, habilitado: true })
    if (guardado.ok) {
      revalidatePath(RUTAS.configuracionDeColaWeb)
    }
    return guardado
  })
