'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCompras } from '../../../areas/compras/composicion'
import { SIN_PERMISO_PARA_COMPRAS } from '../../../entities/compras/errores'
import type { CompraVersionada } from '../../../entities/compras/repositorio'
import { esquemaEliminarCompra } from '../schemas/compra'

// Eliminar una compra (8.11-3, C7): borrado suave, con la versión que se tenía en pantalla. Sin `repuestos.costos.editar` no llega a la base; la RPC lo vuelve a exigir. Si sale bien, la página del
// proyecto se vuelve a leer (la lista y el margen, D3).
export const eliminarCompra = actionClient
  .inputSchema(esquemaEliminarCompra)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CompraVersionada>> => {
    if (!puede(ctx.permisos, 'repuestos.costos.editar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_COMPRAS)
    }
    const hecho = await repositorioDeCompras.eliminar({
      id: parsedInput.id,
      actualizadoEnEsperado: parsedInput.actualizadoEnEsperado,
    })
    if (hecho.ok) {
      revalidatePath(`${RUTAS.repuestos}/${parsedInput.proyectoId}`)
    }
    return hecho
  })
