'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeProyectos } from '../../../areas/proyectos/composicion'
import { SIN_PERMISO_PARA_ELIMINAR_PROYECTOS } from '../../../entities/proyectos/errores'
import type { RestauracionDeProyecto } from '../../../entities/proyectos/repositorio'
import { rutaDelProyecto } from '../../../entities/proyectos/rutas'
import { esquemaRestaurarProyecto } from '../schemas/restaurar'

// «Deshacer» de eliminar un proyecto (8.09-4, C8): lo devuelve con el `eliminado_en` que se vio. Mismo permiso que eliminar; la base decide el resto (`PT409`, 23505).
export const restaurarProyecto = actionClient
  .inputSchema(esquemaRestaurarProyecto)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RestauracionDeProyecto>> => {
    if (!puede(ctx.permisos, 'repuestos.editar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_ELIMINAR_PROYECTOS)
    }
    const hecho = await repositorioDeProyectos.restaurar(parsedInput)
    if (hecho.ok) {
      revalidatePath(rutaDelProyecto(parsedInput.id))
      revalidatePath(RUTAS.repuestos)
    }
    return hecho
  })
