'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeComprobantes } from '../../../areas/comprobantes/composicion'
import type { SerieCambiada } from '../../../entities/comprobantes/repositorio'
import { esquemaCambiarSerie } from '../schemas/comprobantes'

// La pestaña de Configuración › Empresa donde vive la serie.
const RUTA_DE_EMPRESA = '/configuracion/empresa'

// Cambia la serie vigente de los comprobantes (4.26-3). Pide `empresa.ajustes.gestionar` (P1 a del 4.26): emitir comprobantes no alcanza. La versión y el formato
// los vuelve a mirar la base, que devuelve el motivo para la persona.
export const cambiarSerie = actionClient
  .inputSchema(esquemaCambiarSerie)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<SerieCambiada>> => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', 'No tienes permiso para cambiar la serie.')
    }
    const resultado = await repositorioDeComprobantes.cambiarSerie(
      parsedInput.serie,
      parsedInput.actualizadoEn,
    )
    if (resultado.ok) {
      revalidatePath(RUTA_DE_EMPRESA)
    }
    return resultado
  })
