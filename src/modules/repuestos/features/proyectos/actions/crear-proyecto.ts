'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeProyectos } from '../../../areas/proyectos/composicion'
import { SIN_PERMISO_PARA_CREAR_PROYECTOS } from '../../../entities/proyectos/errores'
import type { ProyectoCreado } from '../../../entities/proyectos/repositorio'
import { esquemaCrearProyecto } from '../schemas/proyecto'

// Crea un proyecto de repuestos (8.09-1). El permiso se mira antes de escribir; lo que protege es la base (`repuesto_proyecto_crear` pide `repuestos.editar`).
export const crearProyecto = actionClient
  .inputSchema(esquemaCrearProyecto)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ProyectoCreado>> => {
    if (!puede(ctx.permisos, 'repuestos.editar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_CREAR_PROYECTOS)
    }
    const { id, ...datos } = parsedInput
    const hecho = await repositorioDeProyectos.crear({ id, datos })
    if (hecho.ok) revalidatePath(RUTAS.repuestos)
    return hecho
  })
