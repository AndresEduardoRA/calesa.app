'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_CURSOR, CLAVE_DE_PANEL } from '@/shared/lib/filtros'

import { CLAVE_DE_EDICION, PANEL_NUEVO } from '../claves'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_EDICION]: parseAsString,
  [CLAVE_DE_CURSOR]: parseAsString,
}

// Quién abrió el panel (el botón «Editar» de una fila o de un resumen, «Nuevo»): el foco vuelve ahí al cerrarlo. Es de toda la pantalla,
// no de un componente: el botón y el panel llaman cada uno a su `usePanelDeVehiculo()`.
let quienLoAbrio: HTMLElement | null = null

function recordarQuienLoAbre() {
  quienLoAbrio = document.activeElement instanceof HTMLElement ? document.activeElement : null
}

// A dónde va el foco al cerrar el panel: a quien lo abrió, si sigue en la página; si no, adonde lo deje Base UI.
export function focoAlCerrarElPanel(): HTMLElement | boolean {
  return quienLoAbrio?.isConnected ? quienLoAbrio : true
}

// Qué panel del inventario está abierto, en la URL: `?panel=nuevo` o `?editar=<id>`. Abrir suma
// al historial («atrás» lo cierra). `shallow: false`: para editar, el servidor trae el vehículo.
export function usePanelDeVehiculo() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  return {
    nuevoAbierto: parametros[CLAVE_DE_PANEL] === PANEL_NUEVO,
    enEdicion: parametros[CLAVE_DE_EDICION],
    abrirNuevo: () => {
      recordarQuienLoAbre()
      void setParametros(
        { [CLAVE_DE_PANEL]: PANEL_NUEVO, [CLAVE_DE_EDICION]: null },
        { history: 'push' },
      )
    },
    editar: (id: string) => {
      recordarQuienLoAbre()
      void setParametros({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_EDICION]: id }, { history: 'push' })
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_EDICION]: null })
    },
    // Después de un alta: lo nuevo está en la primera página.
    cerrarYVolverAlPrincipio: () => {
      void setParametros({
        [CLAVE_DE_PANEL]: null,
        [CLAVE_DE_EDICION]: null,
        [CLAVE_DE_CURSOR]: null,
      })
    },
  }
}
