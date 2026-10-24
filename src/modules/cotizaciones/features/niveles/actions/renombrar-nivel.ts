'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeNiveles } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_DE_NIVELES, type RespuestaDeNiveles } from '../../../entities/nivel'
import { esquemaRenombrarNivel } from '../schemas/niveles'
import { comoResultado } from './resultado'

// Cambia el nombre (y el de sus dos permisos). La clave no cambia.
export const renombrarNivel = actionClient
  .inputSchema(esquemaRenombrarNivel)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeNiveles>> => {
    if (!puede(ctx.permisos, 'equipo.roles.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_NIVELES)
    }
    const hecho = comoResultado(await repositorioDeNiveles.renombrar(parsedInput))
    if (hecho.ok) {
      // La pantalla de niveles y la matriz de Roles (que muestra los permisos de cada nivel) cambian con él.
      revalidatePath(RUTAS.configuracionDeCotizacion)
      revalidatePath(RUTAS.roles)
    }
    return hecho
  })
