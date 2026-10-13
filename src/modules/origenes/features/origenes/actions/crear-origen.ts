'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioOrigenes } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { claveDeNombre } from '../../../entities/nombre'
import { esquemaCrearOrigen } from '../schemas/origenes'

// La clave sale del nombre acá, en el servidor, y no cambia después. El flujo, sus reglas y los
// campos del tipo nacen por trigger en el mismo INSERT: o nace todo o no nace nada.
export const crearOrigen = actionClient
  .inputSchema(esquemaCrearOrigen)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const creado = await repositorioOrigenes.crear({
      clave: claveDeNombre(parsedInput.nombre),
      nombre: parsedInput.nombre,
      sustantivo: parsedInput.sustantivo,
      genero: parsedInput.genero,
      tipo: parsedInput.tipo,
      color: parsedInput.color,
      apibaraPlataformas: parsedInput.plataformas,
    })
    if (creado.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
      // La matriz de roles lista los orígenes para acotar permisos.
      revalidatePath(RUTAS.roles)
    }
    return creado
  })
