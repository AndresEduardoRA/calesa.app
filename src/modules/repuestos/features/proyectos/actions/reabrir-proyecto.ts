'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeProyectos } from '../../../areas/proyectos/composicion'
import { SIN_PERMISO_PARA_CERRAR_PROYECTOS } from '../../../entities/proyectos/errores'
import { rutaDelProyecto } from '../../../entities/proyectos/rutas'
import type { CierreDeProyecto } from '../../../entities/proyectos/repositorio'
import { esquemaCierreDeProyecto } from '../schemas/cierre'

// Reabrir un proyecto (8.09-2, C3). El permiso se mira antes de escribir; lo que protege es la base (`repuesto_proyecto_reabrir` pide `repuestos.editar` y la versión que se vio).
export const reabrirProyecto = actionClient
  .inputSchema(esquemaCierreDeProyecto)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CierreDeProyecto>> => {
    if (!puede(ctx.permisos, 'repuestos.editar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_CERRAR_PROYECTOS)
    }
    const hecho = await repositorioDeProyectos.reabrir(parsedInput)
    if (hecho.ok) {
      revalidatePath(rutaDelProyecto(parsedInput.id))
      revalidatePath(RUTAS.repuestos)
    }
    return hecho
  })
