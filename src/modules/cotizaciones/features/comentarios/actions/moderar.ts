'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMarcas } from '../../../areas/comentarios/composicion'
import type { EstadoDeLaCotizacion } from '../../../entities/comentarios/moderacion'
import { esquemaModerar } from '../schemas/marcas'

type Moderacion = { resultado: 'moderada' | 'sin_cambios'; estado: EstadoDeLaCotizacion }

// Invalida la cotización, descarta sus reportes o la reactiva (4.27-4), con la versión que vio quien modera. Lo decide la base: `moderar` y, en una final,
// `final.gestionar` del origen. Sin `revalidatePath`: el Confirmar pide `router.refresh()` al entrar.
export const moderar = actionClient
  .inputSchema(esquemaModerar)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<Moderacion>> => {
    return repositorioDeMarcas.moderar(parsedInput)
  })
