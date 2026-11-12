'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { configurarEnLaRueda as configurarEnLaBase } from '../../../../areas/cola/composicion'
import { MOTIVO_SIN_PERMISO_COLA } from '../../../../entities/cola/rueda'
import { esquemaEnLaRueda } from '../schemas/rueda'

// Habilita a alguien en la rueda (o cambia su cupo, prioridad u orden) desde el formulario, con sus rangos. Devuelve `enLaRueda`: falso si su rol no
// recibe turnos (8-1). La base repite el permiso (`cola_web_configurar`).
export const configurarEnLaRueda = actionClient
  .inputSchema(esquemaEnLaRueda)
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
