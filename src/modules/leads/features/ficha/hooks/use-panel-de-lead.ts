'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_COMPARTIR, PANEL_SALIR, PANEL_TRANSFERIR } from '../../../entities/cartera'
import { PANEL_EDITAR_LEAD } from '../../../entities/edicion'
import { PANEL_AGREGAR_TELEFONO, PANEL_CAMBIAR_TELEFONO } from '../../../entities/telefonos'

const PANELES = new Set([
  PANEL_EDITAR_LEAD,
  PANEL_CAMBIAR_TELEFONO,
  PANEL_AGREGAR_TELEFONO,
  PANEL_COMPARTIR,
  PANEL_TRANSFERIR,
  PANEL_SALIR,
])

// Qué panel de la ficha está abierto, en la URL (`?panel=editar-lead`, `cambiar-telefono`,
// `agregar-telefono`, `compartir-lead`, `transferir-lead` o `salir-lead`). Comparten la clave: no pueden estar
// abiertos a la vez. Abrir suma al historial («atrás» lo cierra; tras recargar, devuelve el foco a quien lo abrió: `vuelta-del-foco.ts`).
// Sin `shallow: false`: abrirlo no necesita al servidor, la ficha ya está.
export function usePanelDeLead() {
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  useVueltaDelFoco(CLAVE_DE_PANEL, panel !== null && PANELES.has(panel))
  const abre = (valor: string) => () => {
    recordarQuienAbre()
    abrirConVuelta(CLAVE_DE_PANEL, () => setPanel(valor, { history: 'push' }), panel === valor)
  }
  const cierra = () => {
    void setPanel(null)
  }
  return {
    // La edición de la ficha.
    abierto: panel === PANEL_EDITAR_LEAD,
    abrir: abre(PANEL_EDITAR_LEAD),
    cerrar: cierra,
    // El cambio del teléfono principal.
    telefono: {
      abierto: panel === PANEL_CAMBIAR_TELEFONO,
      abrir: abre(PANEL_CAMBIAR_TELEFONO),
      cerrar: cierra,
    },
    // Un teléfono extra (un modal).
    extra: {
      abierto: panel === PANEL_AGREGAR_TELEFONO,
      abrir: abre(PANEL_AGREGAR_TELEFONO),
      cerrar: cierra,
    },
    // Dar el lead a otra persona, o pasárselo.
    compartir: { abierto: panel === PANEL_COMPARTIR, abrir: abre(PANEL_COMPARTIR), cerrar: cierra },
    transferir: {
      abierto: panel === PANEL_TRANSFERIR,
      abrir: abre(PANEL_TRANSFERIR),
      cerrar: cierra,
    },
    // «Salir de este lead»: la confirmación.
    salir: { abierto: panel === PANEL_SALIR, abrir: abre(PANEL_SALIR), cerrar: cierra },
    // Alguno abierto: con uno la ficha no se vuelve a leer sola (reiniciaría lo escrito). Cualquier
    // `?panel=` cuenta, también los de otras secciones (un recordatorio, una oportunidad).
    hayPanel: panel !== null,
  }
}
