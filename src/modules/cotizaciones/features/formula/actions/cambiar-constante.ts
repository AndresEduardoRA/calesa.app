'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeLaFormula } from '../../../areas/formula/composicion'
import { MOTIVO_SIN_PERMISO_DE_FORMULA } from '../../../entities/formula/publicacion'
import { esquemaDeCambiarConstante } from '../schemas/constante'

// El ⚙ de una constante desde la hoja (4.20-3a; la pantalla, 4.20-3b): publica la N+1 de la fórmula del origen con el valor nuevo (`formula_cambiar_constante()`, con la
// publicada esperada siempre); la base vuelve a pedir `cotizaciones.configurar` del origen y no toca el borrador. Devuelve el id de la versión nueva.
//
// Sin revalidar ni refrescar, ni aun Configuración › Cotización: en Next 16.4.3 `revalidatePath` (con cualquier ruta), `revalidateTag`, `updateTag` y `refresh`
// vuelven a dibujar la página desde la que se llama la action, y la hoja se remontaría con otra abierta a medio tipear (como `crear-cotizacion.ts`). La pestaña
// «Fórmula» es dinámica y se vuelve a leer al ir a ella; si se la ve desde el historial, sus escrituras dan el PT409 de la base.
export const cambiarConstante = actionClient
  .inputSchema(esquemaDeCambiarConstante)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<string>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_FORMULA)
    }
    const hecho = await repositorioDeLaFormula.cambiarConstante(parsedInput)
    if (hecho.ok) {
      return hecho
    }
    return {
      ok: false,
      error: hecho.error,
      ...(hecho.campo ? { porCampo: { [hecho.campo]: hecho.error.mensaje } } : {}),
    }
  })
