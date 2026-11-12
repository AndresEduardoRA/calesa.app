'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { guardarPoliticaDeLaCola as guardarEnLaBase } from '../../../../areas/cola/composicion'
import { cambiosDePolitica } from '../../../../entities/cola/politica'
import { MOTIVO_SIN_PERMISO_COLA } from '../../../../entities/cola/rueda'
import { esquemaPoliticaDeLaCola } from '../schemas/politica'

// Guarda la política de la cola: sólo sus cinco claves (nunca una del sitio). La base repite el permiso, valida cada clave y compara la versión (`PT409`,
// `web_ajustes_guardar`).
export const guardarPoliticaDeLaCola = actionClient
  .inputSchema(esquemaPoliticaDeLaCola)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.cola.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_COLA)
    }
    const { actualizadoEnEsperado, ...edicion } = parsedInput
    const guardado = await guardarEnLaBase({
      cambios: cambiosDePolitica(edicion),
      actualizadoEnEsperado,
    })
    if (guardado.ok) {
      revalidatePath(RUTAS.configuracionDeColaWeb)
    }
    return guardado
  })
