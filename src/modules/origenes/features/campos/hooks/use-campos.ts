'use client'

import { useAction } from 'next-safe-action/hooks'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarConDeshacer } from '@/shared/ui/toasts'
import type { CambiosDeCampo } from '../../../entities/cambios-de-campo'
import type { CampoDeLayout } from '../../../entities/campo'
import { cerrarConAviso } from '../../resultado'
import { crearCampo } from '../actions/crear-campo'
import { eliminarCampo } from '../actions/eliminar-campo'
import { guardarCampo } from '../actions/guardar-campo'
import { moverCampo } from '../actions/mover-campo'
import { vistaPreviaDeCampo } from '../actions/vista-previa-de-campo'
import type { z } from 'zod'
import type { esquemaCrearCampo } from '../schemas/campos'

type DeLaFila = Pick<CampoDeLayout, 'id' | 'etiqueta' | 'actualizadoEn'>

// Las ediciones del layout de campos. Lo tipeado queda siempre; cada una dice si salió.
export function useCampos() {
  const creando = useAction(crearCampo)
  const guardando = useAction(guardarCampo)
  const moviendo = useAction(moverCampo)
  const eliminando = useAction(eliminarCampo)
  const contando = useAction(vistaPreviaDeCampo)

  async function guardar(campo: DeLaFila, cambios: CambiosDeCampo, version = campo.actualizadoEn) {
    return resultadoDeAccion(
      await conRed(
        guardando.executeAsync({ id: campo.id, actualizadoEnEsperado: version, cambios }),
      ),
    )
  }

  return {
    crear: async (nuevo: z.input<typeof esquemaCrearCampo>) =>
      cerrarConAviso(
        resultadoDeAccion(await conRed(creando.executeAsync(nuevo))),
        `Campo «${nuevo.etiqueta.trim()}» creado`,
      ),
    guardar: async (campo: DeLaFila, cambios: CambiosDeCampo) =>
      cerrarConAviso(await guardar(campo, cambios), `Campo «${campo.etiqueta}» guardado`),
    // Una bandera (en tarjeta, filtrable, público): sin toast, el interruptor ya lo dice.
    cambiarBandera: async (campo: DeLaFila, cambios: CambiosDeCampo) =>
      cerrarConAviso(await guardar(campo, cambios), null),
    // Desactivar y reactivar son reversibles: se hace y se ofrece «Deshacer» con la versión nueva.
    cambiarActivo: async (campo: DeLaFila, activo: boolean) => {
      const resultado = cerrarConAviso(await guardar(campo, { activo }), null)
      if (resultado.ok) {
        const deshacer = resultado.data.actualizadoEn
        avisarConDeshacer(
          activo ? `«${campo.etiqueta}» reactivado` : `«${campo.etiqueta}» desactivado`,
          () => {
            void guardar(campo, { activo: !activo }, deshacer).then((vuelta) =>
              cerrarConAviso(vuelta, null),
            )
          },
        )
      }
      return resultado
    },
    mover: async (campo: DeLaFila, despuesDe: string | null) =>
      cerrarConAviso(
        resultadoDeAccion(
          await conRed(
            moviendo.executeAsync({
              id: campo.id,
              despuesDe,
              actualizadoEnEsperado: campo.actualizadoEn,
            }),
          ),
        ),
        null,
      ),
    eliminar: async (campo: DeLaFila) =>
      cerrarConAviso(
        resultadoDeAccion(
          await conRed(
            eliminando.executeAsync({ id: campo.id, actualizadoEnEsperado: campo.actualizadoEn }),
          ),
        ),
        `Campo «${campo.etiqueta}» eliminado`,
      ),
    // Cuántos vehículos tienen valor: se llama antes de un cambio que podría tocarlos.
    vistaPrevia: async (campoId: string) =>
      cerrarConAviso(resultadoDeAccion(await conRed(contando.executeAsync({ id: campoId }))), null),
    enCurso:
      creando.isPending ||
      guardando.isPending ||
      moviendo.isPending ||
      eliminando.isPending ||
      contando.isPending,
    errores: {
      crear: creando.result.validationErrors?.fieldErrors,
    },
  }
}

export type EdicionesDeCampos = ReturnType<typeof useCampos>
