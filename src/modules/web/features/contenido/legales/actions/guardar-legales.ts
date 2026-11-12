'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { escribirLegales, leerLegales } from '../../../../areas/contenido/composicion'
import {
  MOTIVO_SIN_PERMISO_PARA_LEGALES,
  cambiosDeLegales,
  legalesInvalidos,
} from '../../../../entities/contenido/legales'
import { esquemaGuardarLegales } from '../schemas/legales'

// Guarda los dos legales de una vez (comparten la versión de `ajustes_web`): sólo los que tienen texto y sólo la clave `legales`. Un legal ya
// guardado al que se le vació el texto, o un título que no cabe, vuelven por campo sin tocar la base. La base repite el permiso.
export const guardarLegales = actionClient
  .inputSchema(esquemaGuardarLegales)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_PARA_LEGALES)
    }
    const { actualizadoEnEsperado, ...valores } = parsedInput
    const guardados = await leerLegales()
    if (!guardados.ok) {
      return guardados
    }
    const motivos = legalesInvalidos(valores, guardados.data)
    const primero = Object.values(motivos)[0]
    if (primero !== undefined) {
      return {
        ok: false as const,
        error: { codigo: 'validacion' as const, mensaje: primero },
        porCampo: motivos as Record<string, string>,
      }
    }
    const hecho = await escribirLegales({
      cambios: cambiosDeLegales(valores),
      actualizadoEnEsperado,
    })
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeWeb)
    }
    return hecho
  })
