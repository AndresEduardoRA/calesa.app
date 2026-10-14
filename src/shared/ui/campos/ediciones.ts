import type { ImpactoDeCampo } from '@/shared/lib/campos'
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarConDeshacer } from '@/shared/ui/toasts'
import { cerrarConAviso } from './cerrar-con-aviso'
import type { DeLaFila, EdicionesDeCampos } from './tipos'

// Lo que de un `useAction(accion)` necesita el editor: ejecutar, saber si está en curso y, al
// crear, los errores de validación del servidor.
type Accion<Entrada, Dato> = {
  executeAsync: (
    entrada: Entrada,
  ) => Promise<{ serverError?: ErrorApp; data?: Resultado<Dato> } | undefined>
  isPending: boolean
}

type AccionDeCrear<Nuevo> = Accion<Nuevo, unknown> & {
  result: { validationErrors?: { fieldErrors?: Partial<Record<string, string[]>> } }
}

type Editado = { actualizadoEn: string }

// Las ediciones del layout de campos de un módulo, a partir de sus cinco Server Actions (cada una
// con su `useAction`). Lo tipeado queda siempre; cada edición dice si salió. Los textos son los
// mismos para todo layout.
export function edicionesDeCampos<
  Cambios extends { activo?: boolean },
  Nuevo extends { etiqueta: string },
>(acciones: {
  creando: AccionDeCrear<Nuevo>
  guardando: Accion<{ id: string; actualizadoEnEsperado: string; cambios: Cambios }, Editado>
  moviendo: Accion<{ id: string; despuesDe: string | null; actualizadoEnEsperado: string }, Editado>
  eliminando: Accion<{ id: string; actualizadoEnEsperado: string }, null>
  contando: Accion<{ id: string }, ImpactoDeCampo>
}): EdicionesDeCampos<Cambios, Nuevo> {
  const { creando, guardando, moviendo, eliminando, contando } = acciones
  // Activar o desactivar es un cambio como cualquier otro: sólo viaja `activo`.
  const soloActivo = (activo: boolean) => ({ activo }) as Cambios

  async function guardar(campo: DeLaFila, cambios: Cambios, version = campo.actualizadoEn) {
    return resultadoDeAccion(
      await conRed(
        guardando.executeAsync({ id: campo.id, actualizadoEnEsperado: version, cambios }),
      ),
    )
  }

  return {
    crear: async (nuevo) => {
      const resultado = resultadoDeAccion(await conRed(creando.executeAsync(nuevo)))
      return cerrarConAviso(resultado, `Campo «${nuevo.etiqueta.trim()}» creado`)
    },
    guardar: async (campo, cambios) =>
      cerrarConAviso(await guardar(campo, cambios), `Campo «${campo.etiqueta}» guardado`),
    // Una bandera (en tarjeta, filtrable, solo la cartera): sin toast, el interruptor ya lo dice.
    cambiarBandera: async (campo, cambios) => cerrarConAviso(await guardar(campo, cambios), null),
    // Desactivar y reactivar son reversibles: se hace y se ofrece «Deshacer» con la versión nueva.
    cambiarActivo: async (campo, activo) => {
      const resultado = cerrarConAviso(await guardar(campo, soloActivo(activo)), null)
      if (resultado.ok) {
        const deshacer = resultado.data.actualizadoEn
        avisarConDeshacer(
          activo ? `«${campo.etiqueta}» reactivado` : `«${campo.etiqueta}» desactivado`,
          () => {
            void guardar(campo, soloActivo(!activo), deshacer).then((vuelta) =>
              cerrarConAviso(vuelta, null),
            )
          },
        )
      }
      return resultado
    },
    mover: async (campo, despuesDe) =>
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
    eliminar: async (campo) =>
      cerrarConAviso(
        resultadoDeAccion(
          await conRed(
            eliminando.executeAsync({ id: campo.id, actualizadoEnEsperado: campo.actualizadoEn }),
          ),
        ),
        `Campo «${campo.etiqueta}» eliminado`,
      ),
    // Cuántos registros tienen valor: se llama antes de un cambio que podría tocarlos.
    vistaPrevia: async (campoId) =>
      cerrarConAviso(resultadoDeAccion(await conRed(contando.executeAsync({ id: campoId }))), null),
    enCurso:
      creando.isPending ||
      guardando.isPending ||
      moviendo.isPending ||
      eliminando.isPending ||
      contando.isPending,
    errores: { crear: creando.result.validationErrors?.fieldErrors },
  }
}
