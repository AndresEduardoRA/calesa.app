'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useState } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_PUBLICAR_FORMULA } from '../../../entities/formula/publicacion'
import {
  CLAVE_DE_VERSION,
  PANEL_REVERTIR_FORMULA,
  type VersionParaRevertir,
} from '../../../entities/formula/reversion'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DE_VERSION]: parseAsString }

// Los modales de la pestaña «Fórmula», en la URL: `?panel=publicar-formula` y `?panel=revertir-formula&version=<id>`. Abrir suma al historial («atrás» lo cierra);
// cerrar quita las dos claves. Sin `shallow: false`: abrirlo no necesita al servidor, la pestaña ya está. Tras recargar con el modal abierto, «atrás» devuelve el foco a
// quien lo abrió (`vuelta-del-foco.ts`). «Revertir» entrega su fila antes de escribir la URL: la lista que la trajo (cualquier página) vive en `ListaDeVersiones`, y la
// revisión al llegar la acepta por ser la recién elegida.
export function usePanelDeLaFormula() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const [elegida, setElegida] = useState<VersionParaRevertir | null>(null)
  const panel = url[CLAVE_DE_PANEL]
  const publicando = panel === PANEL_PUBLICAR_FORMULA
  // `?panel=revertir-formula` sin su id también es un revertir (que no abre): se revisa al abrir.
  const revirtiendo = panel === PANEL_REVERTIR_FORMULA
  useVueltaDelFoco(CLAVE_DE_PANEL, publicando || revirtiendo)
  return {
    publicando,
    revirtiendo,
    versionPedida: revirtiendo ? url[CLAVE_DE_VERSION] : null,
    elegida,
    abrirPublicar: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { [CLAVE_DE_PANEL]: PANEL_PUBLICAR_FORMULA, [CLAVE_DE_VERSION]: null },
            { history: 'push' },
          ),
        publicando,
      )
    },
    abrirRevertir: (version: VersionParaRevertir) => {
      setElegida(version)
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { [CLAVE_DE_PANEL]: PANEL_REVERTIR_FORMULA, [CLAVE_DE_VERSION]: version.id },
            { history: 'push' },
          ),
        revirtiendo && url[CLAVE_DE_VERSION] === version.id,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_VERSION]: null })
    },
  }
}

export type PanelDeLaFormula = ReturnType<typeof usePanelDeLaFormula>
