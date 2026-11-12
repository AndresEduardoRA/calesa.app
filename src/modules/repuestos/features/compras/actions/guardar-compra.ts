'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCompras } from '../../../areas/compras/composicion'
import { SIN_PERMISO_PARA_COMPRAS } from '../../../entities/compras/errores'
import type { CompraGuardada } from '../../../entities/compras/repositorio'
import { esquemaGuardarCompra } from '../schemas/compra'

// Registrar o editar una compra (8.11-3, C7). Sin `repuestos.costos.editar` no llega a la base; la RPC lo vuelve a exigir. El id lo trae el cliente: un reintento no
// duplica. Si sale bien, la página del proyecto se vuelve a leer en el servidor (la lista y el margen, D3); un área no importa otra, así que la ruta se arma con `RUTAS`.
export const guardarCompra = actionClient
  .inputSchema(esquemaGuardarCompra)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CompraGuardada>> => {
    if (!puede(ctx.permisos, 'repuestos.costos.editar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_COMPRAS)
    }
    const hecho = await repositorioDeCompras.guardar(parsedInput)
    if (hecho.ok) {
      revalidatePath(`${RUTAS.repuestos}/${parsedInput.proyectoId}`)
    }
    return hecho
  })
