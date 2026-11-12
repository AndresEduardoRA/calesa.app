'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { escribirGuias } from '../../../../areas/contenido/composicion'
import { documentoLimpio } from '../../../../entities/contenido/documento-limpio'
import {
  MOTIVO_SIN_PERMISO_PARA_GUIAS,
  MOTIVO_SIN_PERMISO_PARA_PUBLICAR,
  rutaDeGuia,
} from '../../../../entities/contenido/guias'
import { esquemaGuardarGuia } from '../schemas/guia'

// Guarda la guía de una vez, con su publicación (guardar, publicar, programar y despublicar son un solo `update` con la versión esperada).
// Los permisos se piden antes de tocar la base: guardar pide `web.contenido.gestionar`; publicar, programar y despublicar, además,
// `web.guias.publicar`. La base los repite. El documento se reduce otra vez a la lista blanca en el servidor.
export const guardarGuia = actionClient
  .inputSchema(esquemaGuardarGuia)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_PARA_GUIAS)
    }
    const { id, actualizadoEnEsperado, publicacion, cuerpoDoc, ...campos } = parsedInput
    if (publicacion.tipo !== 'mantener' && !puede(ctx.permisos, 'web.guias.publicar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_PARA_PUBLICAR)
    }
    const guardada = await escribirGuias.guardar({
      id,
      actualizadoEnEsperado,
      campos: { ...campos, cuerpoDoc: documentoLimpio(cuerpoDoc) },
      publicacion,
    })
    if (guardada.ok) {
      revalidatePath(RUTAS.configuracionDeWeb)
      revalidatePath(rutaDeGuia(id))
    }
    return guardada
  })
