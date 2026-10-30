'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useState } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_EDITAR_LEAD } from '../../../entities/edicion'
import { CLAVE_DE_SEGUIMIENTO } from '../../../entities/edicion-de-seguimiento'
import {
  CLAVE_DE_PESTANA,
  hayModalEnLaPestana,
  pestanaDelRapido,
  type PestanaDelRapido,
} from '../../../entities/rapido'
import { CLAVE_DE_RECORDATORIO } from '../../../entities/recordatorios'

// Qué lead está abierto en el drawer rápido, en la URL (`?lead=`), y en qué pestaña (`?pestana=`):
// sobrevive a recargar y se puede compartir. Abrir suma al historial («atrás» lo cierra) y empieza
// en «Resumen»; cambiar de pestaña no suma (así «atrás» cierra el drawer). Tras recargar, «atrás» devuelve el foco a quien abrió el drawer
// o su panel (dos claves: `lead` y `panel`). Sin `shallow: false`: abrirlo no pide nada al servidor; el drawer lee su lead por su cuenta.
export const CLAVE_DE_LEAD = 'lead'

const PARAMETROS = {
  [CLAVE_DE_LEAD]: parseAsString,
  [CLAVE_DE_PESTANA]: parseAsString,
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_SEGUIMIENTO]: parseAsString,
  [CLAVE_DE_RECORDATORIO]: parseAsString,
}

// Lo de la pestaña que se va con ella (un modal que quedó en la URL no salta al volver).
const SIN_MODAL = {
  [CLAVE_DE_PANEL]: null,
  [CLAVE_DE_SEGUIMIENTO]: null,
  [CLAVE_DE_RECORDATORIO]: null,
}

export function useDrawerDeLead() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const pestana = pestanaDelRapido(parametros[CLAVE_DE_PESTANA])
  const id = parametros[CLAVE_DE_LEAD]
  const conModal = hayModalEnLaPestana(pestana, parametros[CLAVE_DE_PANEL])
  const editando = parametros[CLAVE_DE_PANEL] === PANEL_EDITAR_LEAD
  // Montado con un panel encima (tras recargar), la ficha de `lead` no está en la entrada del panel: el hook se ve «cerrado» para `lead` hasta que
  // queda sin panel, y entonces toma la ficha de esa entrada (la del primer «atrás»). Sin recargar no cambia nada: abrir un panel no olvida la ficha
  // (4-59).
  const [esperaSinPanel, setEsperaSinPanel] = useState(parametros[CLAVE_DE_PANEL] !== null)
  if (esperaSinPanel && parametros[CLAVE_DE_PANEL] === null) {
    setEsperaSinPanel(false)
  }
  useVueltaDelFoco(CLAVE_DE_LEAD, id !== null && !esperaSinPanel)
  useVueltaDelFoco(CLAVE_DE_PANEL, editando || conModal)
  return {
    id,
    pestana,
    // Un modal de la pestaña abierto: el drawer no vuelve a leer su lead.
    conModal,
    // El panel de edición está encima del resumen (`?panel=editar-lead`).
    editando,
    editar: () => {
      recordarQuienAbre()
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setParametros({ [CLAVE_DE_PANEL]: PANEL_EDITAR_LEAD }, { history: 'push' }),
        editando,
      )
    },
    // Elegir una pestaña y abrir su modal a la vez (el «⋯» del resumen: anotar o agendar), con el id de lo que se edita vacío.
    abrirModal: (pestanaDelModal: PestanaDelRapido, panel: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setParametros(
            {
              [CLAVE_DE_PESTANA]: pestanaDelModal === 'resumen' ? null : pestanaDelModal,
              [CLAVE_DE_PANEL]: panel,
              [CLAVE_DE_SEGUIMIENTO]: null,
              [CLAVE_DE_RECORDATORIO]: null,
            },
            { history: 'push' },
          ),
        pestana === pestanaDelModal && parametros[CLAVE_DE_PANEL] === panel,
      )
    },
    abrir: (leadId: string) => {
      abrirConVuelta(
        CLAVE_DE_LEAD,
        () =>
          setParametros({ [CLAVE_DE_LEAD]: leadId, [CLAVE_DE_PESTANA]: null }, { history: 'push' }),
        id === leadId,
      )
    },
    elegirPestana: (pestana: PestanaDelRapido) => {
      void setParametros({
        [CLAVE_DE_PESTANA]: pestana === 'resumen' ? null : pestana,
        ...SIN_MODAL,
      })
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_LEAD]: null, [CLAVE_DE_PESTANA]: null, ...SIN_MODAL })
    },
  }
}
