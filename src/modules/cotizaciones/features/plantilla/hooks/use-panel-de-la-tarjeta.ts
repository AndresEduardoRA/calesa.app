'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_DESCARTAR_PLANTILLA } from '../../../entities/plantilla/descartar-la-plantilla'
import { PANEL_PUBLICAR_TARJETA } from '../../../entities/plantilla/publicar-la-plantilla'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString }

// Los dos modales de la pestaña «Tarjeta», en la URL: `?panel=publicar-tarjeta` y `?panel=descartar-plantilla` (4.19-3c). Abrir suma al historial («atrás» lo cierra);
// cerrar quita la clave. Sin `shallow: false`: abrirlo no necesita al servidor, la pestaña ya está. Un solo hook para los dos porque `useVueltaDelFoco` se llama una vez
// por clave: dos hooks con la misma clave se pisarían. Tras recargar con el modal abierto, «atrás» devuelve el foco a quien lo abrió (`vuelta-del-foco.ts`).
export function usePanelDeLaTarjeta() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  const publicando = panel === PANEL_PUBLICAR_TARJETA
  const descartando = panel === PANEL_DESCARTAR_PLANTILLA
  useVueltaDelFoco(CLAVE_DE_PANEL, publicando || descartando)
  return {
    publicando,
    descartando,
    abrirPublicar: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setUrl({ [CLAVE_DE_PANEL]: PANEL_PUBLICAR_TARJETA }, { history: 'push' }),
        publicando,
      )
    },
    abrirDescartar: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setUrl({ [CLAVE_DE_PANEL]: PANEL_DESCARTAR_PLANTILLA }, { history: 'push' }),
        descartando,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null })
    },
  }
}

export type PanelDeLaTarjeta = ReturnType<typeof usePanelDeLaTarjeta>
