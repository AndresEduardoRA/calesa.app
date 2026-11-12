'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeProyectos } from '../../../areas/proyectos/composicion'
import { SIN_PERMISO_PARA_ELIMINAR_PROYECTOS } from '../../../entities/proyectos/errores'
import type { EliminacionDeProyecto } from '../../../entities/proyectos/repositorio'
import { rutaDelProyecto } from '../../../entities/proyectos/rutas'
import { esquemaCierreDeProyecto } from '../schemas/cierre'

// Eliminar un proyecto sin ítems (8.09-4, C8). El permiso se mira antes de escribir; lo que protege es la base (`repuesto_proyecto_eliminar` pide `repuestos.editar`, la versión que se vio y
// que no tenga ítems, compras, pagos ni cotizaciones). La versión es la misma forma que cerrar.
export const eliminarProyecto = actionClient
  .inputSchema(esquemaCierreDeProyecto)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<EliminacionDeProyecto>> => {
    if (!puede(ctx.permisos, 'repuestos.editar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_ELIMINAR_PROYECTOS)
    }
    const hecho = await repositorioDeProyectos.eliminar(parsedInput)
    if (hecho.ok) {
      revalidatePath(rutaDelProyecto(parsedInput.id))
      revalidatePath(RUTAS.repuestos)
    }
    return hecho
  })
