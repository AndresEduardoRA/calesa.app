'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { PANEL_COMPARTIR, PANEL_TRANSFERIR } from '../../../entities/cartera'
import { PANEL_EDITAR_LEAD } from '../../../entities/edicion'
import { PANEL_AGREGAR_TELEFONO, PANEL_CAMBIAR_TELEFONO } from '../../../entities/telefonos'

// Qué panel de la ficha está abierto, en la URL (`?panel=editar-lead`, `cambiar-telefono`,
// `agregar-telefono`, `compartir-lead` o `transferir-lead`). Comparten la clave: no pueden estar
// abiertos a la vez. Abrir suma al historial («atrás» lo cierra).
// Sin `shallow: false`: abrirlo no necesita al servidor, la ficha ya está.
export function usePanelDeLead() {
  const [panel, setPanel] = useQueryState(CLAVE_DE_PANEL, parseAsString)
  const abre = (valor: string) => () => {
    void setPanel(valor, { history: 'push' })
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
    // Alguno abierto: con uno la ficha no se vuelve a leer sola (reiniciaría lo escrito). Cualquier
    // `?panel=` cuenta, también los de otras secciones (un recordatorio, una oportunidad).
    hayPanel: panel !== null,
  }
}
