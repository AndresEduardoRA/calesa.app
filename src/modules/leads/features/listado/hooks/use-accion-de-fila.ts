'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  ACCIONES_DE_FILA,
  accionDeLaUrl,
  CLAVE_PARA,
  type AccionDeFila,
} from '../../../entities/acciones-de-fila'
import { CLAVE_DE_LEAD } from '../../rapido/hooks/use-drawer-de-lead'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_PARA]: parseAsString,
  [CLAVE_DE_LEAD]: parseAsString,
}

// Anotar o agendar desde el «⋯» de una fila, en la URL (`?panel=anotar-seguimiento&para=<id>`):
// recargar lo reabre y «atrás» lo cierra (tras recargar, con el foco en quien lo abrió). Con el drawer abierto (`?lead=`) no responde: lo
// de adentro del drawer es del drawer, y un modal del listado no se abre encima.
export function useAccionDeFila() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const para = parametros[CLAVE_PARA]
  const abierta =
    parametros[CLAVE_DE_LEAD] === null ? accionDeLaUrl(parametros[CLAVE_DE_PANEL], para) : null
  useVueltaDelFoco(CLAVE_DE_PANEL, abierta !== null)
  return {
    accion: abierta,
    // El id tal como vino en la URL: puede no ser de nadie.
    para,
    abrir: (accion: AccionDeFila, leadId: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setParametros(
            {
              [CLAVE_DE_PANEL]: ACCIONES_DE_FILA[accion],
              [CLAVE_PARA]: leadId,
              [CLAVE_DE_LEAD]: null,
            },
            { history: 'push' },
          ),
        abierta === accion && para === leadId,
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null, [CLAVE_PARA]: null })
    },
  }
}
